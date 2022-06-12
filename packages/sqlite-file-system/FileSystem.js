let seq = require("./sequelize/sequelize");
let uuid = require("uuid");
const resolve = require('unix-path-resolve')
const { gzip, ungzip } = require('node-gzip');


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
        let saveData = data;
        if (this.zipFileExtensions.has(extension)) {
            saveData = await gzip(data);
        }
        let file = await volDb.create({ id: fileUuid, data: saveData });
        await file.save();
        if (exists) {
            let data = await this.mainDB.Files.findByPk(fullPath);
            let id = data.getDataValue("storagePosition");
            let fileUuid = data.getDataValue("fileUuid");
            await this.mainDB.Files.upsert({ fullPath: fullPath, size: 1, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
            this.#deleteVolFile(id, fileUuid);
        } else {
            await this.mainDB.Files.upsert({ fullPath: fullPath, size: 1, parentPath: parentPath, fileUuid: fileUuid, storagePosition: "0" });
        }
    }

}