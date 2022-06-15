let seq = require("./sequelize/sequelize");
let uuid = require("uuid");
const { gzip, ungzip } = require('node-gzip');
const Sequelize = require("sequelize");
var replaceall = require("replaceall");
const Op = Sequelize.Op;
const PathTool = require("./PathTool");

module.exports = class FileSystem {

    /**
     * 
     * @param {string} savePath 存储文件夹
     */
    constructor(savePath) {
        this.savePath = savePath;
        this.volDBMap = new Map();
        this.zipFileExtensions = new Set(["txt", "json", "html"]);
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
    async getVolDB(id) {
        if (!this.volDBMap.has(id)) {
            this.volDBMap.set(id, await seq.initVol(this.savePath, id));
        }
        return this.volDBMap.get(id);
    }

    /**
     * @private
     */
    async getAvailableVolId() {
        return "0";
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
        let volDb = await this.getVolDB(volId);
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
            console.log(error);
            console.log(error.original);
            if (error.original && error.original.code === "SQLITE_CONSTRAINT") {
                throw new Error("创建文件夹失败 找不到父文件夹" + `${fullPath} (${path})`);
            } else {
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

        await (await this.getVolDB(volId)).bulkCreate(volInfoList);
        await this.mainDB.Files.bulkCreate(fileInfoList, { updateOnDuplicate: ["size", "fileUuid", "storagePosition", "updatedAt"] });
        let delGroup = {};
        for (let i = 0; i < findResult.length; i++) {
            let { fileUuid, storagePosition } = findResult[i];
            delGroup[storagePosition] = delGroup[storagePosition] || [];
            delGroup[storagePosition].push(fileUuid);
        }
        let tasks = Object.keys(delGroup).map(async volId => {
            let volDb = await this.getVolDB(volId);
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
            let volDb = await this.getVolDB(volId);
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
        let volDb = await this.getVolDB("0");
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
                await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
                this.#deleteVolFile(id, oldFileUuid);
            } else {
                await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
            }
        } catch (error) {
            console.log(error);
            if (error.original && error.original.code === "SQLITE_CONSTRAINT") {
                throw new Error("写入文件失败，可能是没有父文件夹" + fullPath + `(${path})`);
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
        let volDb = await this.getVolDB(volId);
        let findObj = await volDb.findByPk(fileUuid);
        let saveData = findObj.getDataValue("data");
        if (this.zipFileExtensions.has(extension)) {
            saveData = await ungzip(saveData);
        }
        return saveData;
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
}