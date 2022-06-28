let seq = require("./sequelize/sequelize");
let uuid = require("uuid");
let fs = require("fs");
let path = require("path");
const { gzip, ungzip } = require('node-gzip');
const Sequelize = require("sequelize");
var replaceall = require("replaceall");
const Op = Sequelize.Op;
const PathTool = require("./PathTool");

const FILE_SIZE_MB = 1024; //1G
module.exports = class FileSystem {

    /**
     * 
     * @param {string} savePath 存储文件夹
     */
    constructor(savePath) {
        this.savePath = savePath;
        this.volDBMap = new Map();
        this.zipFileExtensions = new Set(["txt", "json", "html"]);
        process.on("exit", () => {
            setTimeout(() => {
                this.close();
            }, 1000);
        });
        this.#dynamicVolWatch();
    }

    #closed = false;

    #watchMap = new Map();
    #volFileSizeMap = new Map();
    #currentVoldId = 0;

    #dynamicVolWatch() {
        let watchFileById = async (id) => {
            let dbPath = path.resolve(this.savePath, `${id}.sqlite.db`);
            if (!this.#watchMap.has(dbPath)) {
                if (fs.existsSync(dbPath)) {
                    let currentSize = fs.statSync(dbPath).size / 1024 / 1024;
                    this.#volFileSizeMap.set(id, currentSize);
                    if (currentSize > FILE_SIZE_MB) {
                        if (this.#currentVoldId.toString() === id) {//如果是当前最后一个文件 
                            await this.#getVolDB((parseInt(id) + 1).toString());
                            this.#currentVoldId = (parseInt(id) + 1);
                            this.#dynamicVolWatch();
                        }
                    }
                } else {
                    this.#volFileSizeMap.set(id, 0);
                }
                let listener = async (curr, prev) => {
                    let mb = curr.size / 1024 / 1024;
                    this.#volFileSizeMap.set(id, mb);
                    if (mb >= FILE_SIZE_MB) {
                        if (this.#currentVoldId.toString() === id) {//如果是当前最后一个文件 
                            await this.#getVolDB((parseInt(id) + 1).toString());
                            console.log("文件大小超过限制生成新的数据库文件");
                            this.#currentVoldId = (parseInt(id) + 1);
                            this.#dynamicVolWatch();
                        }
                    }
                };
                if (this.#watchMap.has(dbPath)) {
                    console.log("重复的ID!?");
                } else {
                    this.#watchMap.set(dbPath, listener);
                    fs.watchFile(dbPath, listener);
                }
            }
        }

        for (let i = 0; i <= this.#currentVoldId; i++) {
            let id = i.toString();
            watchFileById(id);
        }

    }

    /**
     * 关闭数据库
     */
    async close() {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        console.log("关闭数据库" + this.savePath);
        this.mainDB.Files.sequelize.close();
        this.#watchMap.forEach((v, k) => {
            console.log("unwatch", k);
            fs.unwatchFile(k, v);
        });
        this.volDBMap.forEach((v, k) => {
            v.sequelize.close();
        });
    }

    /**
     * 初始化
     */
    async init() {
        this.mainDB = await seq.initMain(this.savePath);
    }

    /**
     * @private
     */
    async #getVolDB(id) {
        if (!this.volDBMap.has(id)) {
            this.volDBMap.set(id, await seq.initVol(this.savePath, id));
        }
        return this.volDBMap.get(id);
    }

    /**
     * @private
     */
    async getAvailableVolId() {
        return this.#currentVoldId.toString();
    }

    /**
     * 检查文件是否存在
     * @param {*} path 路径
     * @returns 
     */
    async existsFile(path) {
        let { fullPath } = PathTool.parseFilePath(path);
        let count = await this.mainDB.Files.count({ where: { fullPath: fullPath } });
        return count === 1;
    }


    /**
     * 检查文件夹是否存在
     * @param {*} path 路径
     * @returns 
     */
    async existsDir(path) {
        let { fullPath } = PathTool.parseDirPath(path);
        let count = await this.mainDB.Files.count({ where: { fullPath: fullPath } });
        return count === 1;
    }

    /**
     * 删除文件
     * @param {string} path 路径
     */
    async deleteFile(path) {
        let { fullPath, validate } = PathTool.parseFilePath(path);
        if (!validate) {
            throw new Error("文件路径不合法" + `${fullPath}(${path})`);
        }
        let data = await this.mainDB.Files.findByPk(fullPath);
        if (!data) {
            throw new Error("找不到文件" + + `${fullPath}(${path})`);
        }
        let id = data.getDataValue("storagePosition");
        let fileUuid = data.getDataValue("fileUuid");
        await this.#deleteVolFile(id, fileUuid);
        await this.mainDB.Files.destroy({ where: { fullPath: fullPath } });
    }

    async #deleteVolFile(volId, fileUuid) {
        let volDb = await this.#getVolDB(volId);
        await volDb.destroy({ where: { id: fileUuid } });
    }

    /**
     * 创建文件夹
     * @param {string} path 路径
     */
    async mkdir(path) {
        let { parentPath, fullPath, fileName } = PathTool.parseDirPath(path);
        try {
            await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, parentPath: parentPath });
        } catch (error) {
            if (error.original && error.original.code === "SQLITE_CONSTRAINT") {
                throw new Error("创建文件夹失败 找不到父文件夹" + `${fullPath} (${path})`);
            } else {
                console.error(error);
                throw error;
            }
        }
    }

    /**
     * 删除文件夹及其文件夹下的文件
     * @param {string} path 路径
     */

    async deldir(path) {
        let { fullPath } = PathTool.parseDirPath(path);
        let files = await this.listFiles(path);
        let fileList = [];
        let dirList = [];
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let isDir = file.fileUuid === null;
            if (isDir) {
                dirList.push(file.fullPath);
            } else {
                fileList.push(file.fullPath);
            }
        }
        await Promise.all(dirList.map(dir => this.deldir(dir)));
        await this.batchDeleteFiles(fileList);
        await this.mainDB.Files.destroy({ where: { fullPath: fullPath } });
    }

    /**
     * 
     * @param {Array<import("./types").BatchWriteParam>} batchList 
     */
    async batchWriteFiles(batchList) {
        let parsedBatchList = await Promise.all(batchList.map(async (param) => {
            let { fullPath, validate, extension, fileName, parentPath } = PathTool.parseFilePath(param.path);
            if (!validate) {
                throw new Error("文件路径有误" + `${fullPath}(${param.path})`);
            }
            let saveData = Buffer.from(param.data);
            let size = saveData.byteLength;
            if (this.zipFileExtensions.has(extension)) {
                saveData = await gzip(saveData);
            }

            let newParam = {
                fullPath: fullPath,
                data: saveData,
                size: size,
                fileName: fileName,
                parentPath: parentPath
            }
            return newParam;
        }));

        let findResult = await this.mainDB.Files.findAll({
            attributes: ["fileUuid", "storagePosition"],
            where: {
                fullPath: {
                    [Op.in]: parsedBatchList.map(p => p.path)
                }
            },
            raw: true
        });

        let volInfoList = [];
        let fileInfoList = [];

        let volId = await this.getAvailableVolId();
        parsedBatchList.forEach(p => {
            let id = uuid.v4();
            volInfoList.push({ data: p.data, id: id });
            fileInfoList.push({
                fullPath: p.fullPath,
                fileName: p.fileName,
                parentPath: p.parentPath,
                size: p.size,
                fileUuid: id,
                storagePosition: volId
            });
        });

        await (await this.#getVolDB(volId)).bulkCreate(volInfoList);
        await this.mainDB.Files.bulkCreate(fileInfoList, { updateOnDuplicate: ["size", "fileUuid", "storagePosition", "updatedAt"] });
        let delGroup = {};
        for (let i = 0; i < findResult.length; i++) {
            let { fileUuid, storagePosition } = findResult[i];
            delGroup[storagePosition] = delGroup[storagePosition] || [];
            delGroup[storagePosition].push(fileUuid);
        }
        let tasks = Object.keys(delGroup).map(async volId => {
            let volDb = await this.#getVolDB(volId);
            await volDb.destroy({
                where: {
                    id: {
                        [Op.in]: delGroup[volId]
                    }
                }
            })
        });
        await Promise.all(tasks);
    }

    async batchDeleteFiles(files) {
        let parsedFiles = files.map((path) => {
            let { fullPath, validate } = PathTool.parseFilePath(path);
            if (!validate) {
                throw new Error("文件路径有误" + `${fullPath}(${path})`);
            }
            return fullPath;
        });

        let findResult = await this.mainDB.Files.findAll({
            attributes: ["fileUuid", "storagePosition"],
            where: {
                fullPath: {
                    [Op.in]: parsedFiles
                }
            },
            raw: true
        });

        await this.mainDB.Files.destroy({
            where: {
                fullPath: {
                    [Op.in]: parsedFiles
                }
            }
        });

        let delGroup = {};
        for (let i = 0; i < findResult.length; i++) {
            let { fileUuid, storagePosition } = findResult[i];
            delGroup[storagePosition] = delGroup[storagePosition] || [];
            delGroup[storagePosition].push(fileUuid);
        }
        let tasks = Object.keys(delGroup).map(async volId => {
            let volDb = await this.#getVolDB(volId);
            await volDb.destroy({
                where: {
                    id: {
                        [Op.in]: delGroup[volId]
                    }
                }
            })
        });
        await Promise.all(tasks);

    }


    /**
     * 写入/覆盖文件
     * @param {string} path 路径
     * @param {string | Buffer} data 数据
     */
    async writeFile(path, data) {
        let exists = await this.existsFile(path);
        let { fileName, parentPath, extension, fullPath } = PathTool.parseFilePath(path);
        let fileUuid = uuid.v4();
        let volId = await this.getAvailableVolId();
        let volDb = await this.#getVolDB(volId);
        let saveData = Buffer.from(data);
        let size = saveData.byteLength;
        if (this.zipFileExtensions.has(extension)) {
            saveData = await gzip(data);
        }
        let file = await volDb.create({ id: fileUuid, data: saveData });
        await file.save();
        try {
            if (exists) {
                let data = await this.mainDB.Files.findByPk(fullPath);
                let id = data.getDataValue("storagePosition");
                let oldFileUuid = data.getDataValue("fileUuid");
                await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: volId });
                this.#deleteVolFile(id, oldFileUuid);
            } else {
                await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: volId });
            }
        } catch (error) {
            console.log(error);
            if (error.original && error.original.code === "SQLITE_CONSTRAINT") {
                throw new Error("写入文件失败，可能是没有父文件夹" + fullPath + `(${path})P:${parentPath}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * 读取文件内容
     * @param {string} path 
     * @returns {Buffer} 二进制Buffer
     */
    async readFile(path) {
        let { fullPath, extension } = PathTool.parseFilePath(path);
        let data = await this.mainDB.Files.findByPk(fullPath);
        if (!data) {
            throw new Error("找不到文件" + path);
        }
        let volId = data.getDataValue("storagePosition");
        let fileUuid = data.getDataValue("fileUuid");
        let volDb = await this.#getVolDB(volId);
        let findObj = await volDb.findByPk(fileUuid);
        let saveData = findObj.getDataValue("data");
        if (this.zipFileExtensions.has(extension)) {
            saveData = await ungzip(saveData);
        }
        return saveData;
    }

    /**
    * 读取文件信息
    * @param {string} path 
     * @returns { import("./types").FileInfo }
    */
    async getFileInfo(path) {
        let { fullPath, extension } = PathTool.parseFilePath(path);
        let data = await this.mainDB.Files.findByPk(fullPath, { raw: true });
        if (!data) {
            throw new Error("找不到文件" + path);
        }
        return data;
    }

    /**
     * 读取文件为字符串
     * @param {string} path 
     * @returns 文件字符串内容
     */
    async readFileAsString(path) {
        let buffer = await this.readFile(path);
        return new String(buffer).toString();
    }

    /**
     * 列出文件夹内容
     * @param {string} parentPath 父文件夹路径
     * @returns {Array<import("./types").FileInfo>}
     */
    async listFiles(parentPath) {
        let { fullPath } = PathTool.parseDirPath(parentPath);
        let result = await this.mainDB.Files.findAll({
            where: { parentPath: fullPath },
            raw: true
        });
        return result;
    }

    /**
     * 列出文件夹内容(用于分页)
     * @param {string} parentPath 父文件夹路径
     * @param {string} start 起始文件名（不含）
     * @param {number} limit 限制数量
     * @returns {Array<import("./types").FileInfo>}
     */
    async listFilesLimit(parentPath, start, limit) {
        let { fullPath } = PathTool.parseFilePath(parentPath);
        let result = await this.mainDB.Files.findAll({
            where: {
                parentPath: fullPath,
                fullPath: {
                    [Op.gt]: start
                }
            },
            limit: limit,
            raw: true
        });
        return result;
    }

    /**
     * 用字符串搜索文件
     * @param {string} name 搜索字符串
     * @returns {Array<import("./types").FileInfo>}
     */
    async findFiles(name) {
        let result = await this.mainDB.Files.findAll({
            where: {
                fileName: {
                    [Op.substring]: `%${name}%`
                }
            },
            raw: true
        });
        return result;
    }

    /**
     * 用正则表达式搜索文件
     * @param {string} str 正则表达式
     * @returns {Array<import("./types").FileInfo>}
     */
    async findFilesByLike(str) {
        let result = await this.mainDB.Files.findAll({
            where: {
                fileName: {
                    [Op.like]: str
                }
            },
            raw: true
        });
        return result;
    }


    /**
     * 批量重命名
     * @param {Array<import("./types").RenameParam>} list 参数 
     */
    async batchRenameFiles(list) {
        let parsedList = list.map(({ from, to }) => {
            let fromInfo = PathTool.parseFilePath(from);
            let toInfo = PathTool.parseFilePath(to);
            if (!fromInfo.validate) {
                throw new Error("文件路径有误" + `${fromInfo.fullPath}(${from})`);
            }
            if (!toInfo.validate) {
                throw new Error("文件路径有误" + `${toInfo.fullPath}(${to})`);
            }
            return { from: fromInfo.fullPath, to: toInfo.fullPath };
        });

        const t = await this.mainDB.Files.sequelize.transaction();
        // let all = await this.mainDB.Files.findAll({
        //     where: {
        //         fullPath: {
        //             [Op.in]: list.map(p => p.from)
        //         }
        //     }
        // });
        try {
            for (let i = 0; i < parsedList.length; i++) {
                let obj = parsedList[i];
                let { parentPath, fileName } = PathTool.parseFilePath(obj.to);
                await this.mainDB.Files.update({
                    fullPath: obj.to,
                    parentPath,
                    fileName
                },
                    {
                        where: {
                            fullPath: obj.from
                        },
                        transaction: t
                    }
                );
            }
            await t.commit();
        } catch (error) {
            await t.rollback();
            console.error(error);
            throw new Error("重命名失败文件名重复");
        }
    }

    async renameFile(from, to) {
        return await this.batchRenameFiles([{ from, to }]);
    }

    async renameDir(from, to) {
        let toInfo = PathTool.parseDirPath(to);
        // let fromInfo = PathTool.parseDirPath(from);
        if (await this.existsDir(to)) {
            throw new Error("要重命名的文件夹已经存在" + to);
        }
        await this.mkdir(to);
        let files = await this.listFiles(from);
        let dirRenameList = [];
        let fileRenameList = [];
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let isDir = file.fileUuid === null;
            if (isDir) {
                dirRenameList.push({ from: file.fullPath, to: toInfo.fullPath + "/" + file.fileName + "/" });
            } else {
                fileRenameList.push({ from: file.fullPath, to: toInfo.fullPath + "/" + file.fileName });
            }
        }

        for (let i = 0; i < dirRenameList.length; i++) {
            let dirTask = dirRenameList[i];
            await this.renameDir(dirTask.from, dirTask.to);
        }
        await this.batchRenameFiles(fileRenameList);
        await this.deldir(from);
    }

}