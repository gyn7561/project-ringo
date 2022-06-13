let seq = require("./sequelize/sequelize");
let uuid = require("uuid");
const resolve = require('unix-path-resolve')
const { gzip, ungzip } = require('node-gzip');
const Sequelize = require("sequelize");

const Op = Sequelize.Op;


function parseFileName(path) {
    let fullPath = resolve("/", path);
    let split = fullPath.split("/");
    let fileName = split[split.length - 1];
    let parentPath = split.slice(0, split.length - 1).join("/") + "/";
    let extension = (fileName.split(".")[1] || "").toLowerCase();
    return { fileName, parentPath, extension, fullPath };
}


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

    async saveData(path, data) {
        return this._saveData(path, data);
    }

    async exists(path) {
        let { fullPath } = parseFileName(path);
        let count = await this.mainDB.Files.count({ where: { fullPath: fullPath } });
        return count === 1;
    }

    async deleteFile(path) {
        let { fullPath } = parseFileName(path);
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

    async _saveData(path, data) {
        let exists = await this.exists(path);
        let { fileName, parentPath, extension, fullPath } = parseFileName(path);
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
            await this.mainDB.Files.upsert({ fullPath: fullPath, fileName: fileName, size: size, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
        }
    }

    async readFile(path) {
        let { fullPath, extension } = parseFileName(path);
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
        let { fullPath } = parseFileName(parentPath);
        let result = await this.mainDB.Files.findAll({
            where: { parentPath: fullPath },
            raw: true
        });
        return result;
    }

    async listFilesLimit(parentPath, start, limit) {
        let { fullPath } = parseFileName(parentPath);
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
                    [Op.like]: `%${name}%`
                }
            },
            raw: true
        });
        return result;
    }
}