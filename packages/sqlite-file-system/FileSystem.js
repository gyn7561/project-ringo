let seq = require("./sequelize/sequelize");
let uuid = require("uuid");
const { gzip, ungzip } = require('node-gzip');
const Sequelize = require("sequelize");
var replaceall = require("replaceall");
const Op = Sequelize.Op;
const PathTool = require("./PathTool");

module.exports = class FileSystem {

    constructor(savePath) {
        this.savePath = savePath;
        this.volDBMap = new Map();
        this.zipFileExtensions = new Set(["txt", "json", "html"]);
    }

    async init() {
        this.mainDB = await seq.initMain(this.savePath);
    }

    async getVolDB(id) {
        if (!this.volDBMap.has(id)) {
            this.volDBMap.set(id, await seq.initVol(this.savePath, id));
        }
        return this.volDBMap.get(id);
    }


    async exists(path) {
        let { fullPath } = PathTool.parseFilePath(path);
        let count = await this.mainDB.Files.count({ where: { fullPath: fullPath } });
        return count === 1;
    }

    async deleteFile(path) {
        let { fullPath, validate } = PathTool.parseFilePath(path);
        if (!validate) {
            throw new Error("");
        }
        let data = await this.mainDB.Files.findByPk(fullPath);
        if (!data) {
            throw new Error("找不到文件" + path);
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

    async deldir(path) {
        // let { parentPath, fullPath } = PathTool.parseFilePath(path);
        let files = await this.listFiles(path);
        for (let i = 0; i < files.length; i++) {

        }
    }

    async writeFile(path, data) {
        let exists = await this.exists(path);
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
        if (exists) {
            let data = await this.mainDB.Files.findByPk(fullPath);
            let id = data.getDataValue("storagePosition");
            let oldFileUuid = data.getDataValue("fileUuid");
            await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
            this.#deleteVolFile(id, oldFileUuid);
        } else {
            console.log({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" })
            await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
        }
    }

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

    async readFileAsString(path) {
        let buffer = await this.readFile(path);
        return new String(buffer).toString();
    }

    async listFiles(parentPath) {
        let { fullPath } = PathTool.parseFilePath(parentPath);
        let result = await this.mainDB.Files.findAll({
            where: { parentPath: fullPath },
            raw: true
        });
        return result;
    }

    async listFilesLimit(parentPath, start, limit) {
        let { fullPath } = PathTool.parseFilePath(parentPath);
        let result = await this.mainDB.Files.findAll({
            where: {
                parentPath: fullPath,
                fullPath: {
                    [Op.gte]: start
                }
            },
            limit: limit,
            raw: true
        });
        return result;
    }

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