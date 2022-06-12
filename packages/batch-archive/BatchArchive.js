var AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
var AsyncLock = require('async-lock');
let tools = require("@ringoc/crawler-tools");
let logger = tools.logger;

async function lockRun(lock, key, promise) {
    return await lock.acquire(key, (done) => {
        promise.then((ret) => {
            done(null, ret);
        }).catch(e => {
            done(e, null);
        })
    })
}

class BatchArchive {

    constructor({ saveDirPath, zipLevel = 8, onePackageFiles = 1000 }) {
        this.saveDirPath = path.resolve(saveDirPath);
        this.zipLevel = zipLevel;
        this.onePackageFiles = onePackageFiles;
        this.tempList = [];
        this.fileCount = 0;
        this.version = "0.0.1";
        this.lock = new AsyncLock();
    }


    #getTempDirPath() {
        return path.resolve(this.saveDirPath, "_temp");
    }

    #getKVDBDirPath() {
        return path.resolve(this.saveDirPath, "_level_db");
    }

    #getMetaDirPath() {
        return path.resolve(this.saveDirPath, "_meta");
    }

    #getMetaFilePath(fileId) {
        return path.resolve(this.#getMetaDirPath(), `${fileId}.json`);
    }

    async init() {
        return await lockRun(this.lock, "IO", this.#init());
    }

    async #init() {
        fs.mkdirSync(this.#getTempDirPath(), { recursive: true });
        fs.mkdirSync(this.#getMetaDirPath(), { recursive: true });
        fs.mkdirSync(this.#getKVDBDirPath(), { recursive: true });
        let versionJson = path.resolve(this.#getMetaDirPath(), `version-${this.version}.json`);
        if (fs.existsSync(versionJson)) {
            fs.writeFileSync(versionJson, JSON.stringify({ time: new Date().getTime(), timeString: new Date().toString() }));
        }
        if (fs.readdirSync(this.saveDirPath).filter(f => f.endsWith(".bk")).length > 0) {
            logger.error("检查到BK后缀文件,上次IO中断,需要手动恢复", this.saveDirPath);
            throw new Error("检查到BK后缀文件,上次IO中断,需要手动恢复" + this.saveDirPath);
        }

        this.kv = tools.storage.openLevelDBStorage(this.#getKVDBDirPath());
        await this.kv.clear();
        this.commonKv = tools.storage.createCommonKV(this.kv);
        let metaFiles = new Set(fs.readdirSync(this.#getMetaDirPath()));
        let batchList = [];
        while (metaFiles.has(`${this.fileCount}.json`)) {
            logger.info("读取META文件", `${this.fileCount}.json`);
            let id = this.fileCount;
            let files = JSON.parse(fs.readFileSync(this.#getMetaFilePath(id), "utf-8"));
            for (let j = 0; j < files.length; j++) {
                batchList.push({ type: 'put', key: files[j].name, value: id });
            }
            this.fileCount++;
        }
        let files = fs.readdirSync(this.#getTempDirPath());
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            this.tempList.push(file);
            batchList.push({ type: 'put', key: file, value: "disk" });
        }
        await this.kv.batch(batchList);
    }

    async exists(fileName) {
        return await lockRun(this.lock, "IO", this.#exists(fileName));
    }

    async #exists(fileName) {
        let value = await this.commonKv.get(fileName);
        if (typeof value === "number" || typeof value === "string") {
            return true;
        }
        return false;
    }


    async updateFile(fileName, data) {
        return await lockRun(this.lock, "IO", this.#updateFile(fileName, data));
    }

    async #updateFile(fileName, data) {
        await this.#deleteFile(fileName);
        await this.#writeFile(fileName, data);
    }

    async deleteFile(fileName) {
        return await lockRun(this.lock, "IO", this.#deleteFile(fileName));
    }

    async #deleteFile(fileName) {
        if (!(await this.#exists(fileName))) {
            throw new Error("要删除的文件不存在");
        }
        let value = await this.commonKv.get(fileName);
        if (value === "disk") {
            let tempFilePath = path.resolve(this.#getTempDirPath(), fileName);
            fs.promises.unlink(tempFilePath);
            this.tempList = this.tempList.filter(n => n !== fileName);
        } else {
            let zipPath = path.resolve(this.saveDirPath, value + ".zip");
            let zipPathBk = path.resolve(this.saveDirPath, value + ".zip.bk");
            //重写过程中先做备份
            fs.renameSync(zipPath, zipPathBk);
            let zipFile = new AdmZip(zipPathBk);
            zipFile.deleteFile(fileName);
            let list = zipFile.getEntries().map(e => { return { name: e.name, size: e.header.size } });
            await fs.promises.writeFile(path.resolve(this.#getMetaDirPath(), `${value}.json`), JSON.stringify(list));
            await zipFile.writeZipPromise(zipPath);
            await fs.promises.unlink(zipPathBk);
        }
        await this.kv.del(fileName);
    }

    async writeFile(fileName, data) {
        return await lockRun(this.lock, "IO", this.#writeFile(fileName, data));
    }

    async #writeFile(fileName, data) {
        if (await this.#exists(fileName)) {
            await this.#updateFile(fileName, data);
            return;
        }
        let tempFilePath = path.resolve(this.#getTempDirPath(), fileName);
        await fs.promises.writeFile(tempFilePath, data);
        await this.commonKv.set(fileName, "disk");
        this.tempList.push(fileName);
        if (this.tempList.length >= this.onePackageFiles) {
            await this.#zipListFiles();
        }
    }


    async readFile(fileName) {
        return await lockRun(this.lock, "IO", this.#readFile(fileName));
    }


    async #readFile(fileName) {
        let value = await this.commonKv.get(fileName);
        let hasFile = typeof value === "number" || typeof value === "string";
        if (!hasFile) {
            throw new Error("readfile 文件不存在" + fileName);
        }
        let positionId = await this.commonKv.get(fileName);
        if (positionId === "disk") {
            return await fs.promises.readFile(path.resolve(this.#getTempDirPath(), fileName));
        } else {
            let zipPath = path.resolve(this.saveDirPath, positionId + ".zip");
            let zipFile = new AdmZip(zipPath);
            return zipFile.readFile(fileName);
        }
    }


    async readFileAsString(fileName) {
        let buffer = await this.readFile(fileName);
        return new String(buffer).toString();
    }

    async #zipListFiles() {
        if (this.tempList.length === 0) {
            return;
        }
        let fileId = this.fileCount;
        let newFile = path.resolve(this.saveDirPath, fileId + ".zip");
        let zipFile = new AdmZip();

        for (let i = 0; i < this.tempList.length; i++) {
            let fileName = this.tempList[i];
            let tempFilePath = path.resolve(this.#getTempDirPath(), fileName);
            zipFile.addLocalFile(tempFilePath);
        }
        let entries = zipFile.getEntries();
        entries.forEach(e => {
            e.header.method = this.zipLevel;
        })
        let list = zipFile.getEntries().map(e => { return { name: e.name, size: e.header.size } });
        await zipFile.writeZipPromise(newFile);
        await fs.promises.writeFile(path.resolve(this.#getMetaDirPath(), `${fileId}.json`), JSON.stringify(list));
        let batchList = [];
        for (let i = 0; i < this.tempList.length; i++) {
            let fileName = this.tempList[i];
            let tempFilePath = path.resolve(this.#getTempDirPath(), fileName);
            await fs.promises.unlink(tempFilePath);
            batchList.push({ type: 'put', key: fileName, value: fileId });
        }

        await this.kv.batch(batchList);
        this.fileCount++;
        this.tempList = [];
    }


    async finalize() {
        return await lockRun(this.lock, "IO", this.#finalize());
    }

    async #finalize() {
        await this.#zipListFiles();
    }

    async close() {
        this.kv.clear();
        this.kv.close();
    }

    async readAllFiles(func) {
        return await lockRun(this.lock, "IO", this.#readAllFiles(func));
    }

    async #readAllFiles(func) {
        let id = 0;
        let files = new Set(fs.readdirSync(this.saveDirPath));
        let count = 0;

        while (files.has(`${id}.zip`)) {
            logger.info(`读取${id}.zip`);
            let zipFile = new AdmZip(`${id}.zip`);
            let list = zipFile.getEntries();
            for (let i = 0; i < list.length; i++) {
                let data = list[i].getData();
                await func(list[i].name, data);
                count++;
            }
            id++;
        }
        files = fs.readdirSync(this.#getTempDirPath());
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            await func(file, fs.readFileSync(path.resolve(this.#getTempDirPath(), file)));
            count++;
        }
        logger.info("读取完成共读取" + count + "个文件");
    }

    async readAllFilesAsString(func) {
        return await this.readAllFiles(async (fileName, data) => {
            await func(fileName, new String(data).toString());
        });
    }


    async listFiles(start, limit) {
        return await lockRun(this.lock, "IO", this.#listFiles(start, limit));
    }


    async #listFiles(start, limit) {
        let keys = await this.kv.keys({ gte: start, limit: limit }).all();
        return keys;
    }


    async searchFiles(search) {
        return await lockRun(this.lock, "IO", this.#searchFiles(search));
    }


    async #searchFiles(search) {
        let all = await (await this.kv.keys().all());
        return all.filter(str => {
            return str.includes(search);
        });
    }


}

module.exports = BatchArchive;