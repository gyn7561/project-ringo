const { FtpSrv, FileSystem } = require('ftp-srv');
const { Readable, Writable } = require('stream');

const PathTool = require('./PathTool');
let raw = false;
class FtpFileSystem extends FileSystem {
    /**
     * 
     * @param {import("./FileSystem")} sfs 
     */
    constructor(sfs) {
        super();
        this.sfs = sfs;
        this.currentPath = "/";
        // super(...arguments);
    }

    currentDirectory() {
        if (raw) {
            let r = super.currentDirectory();
            console.log("currentDirectory", r);
            return r;
        } else {
            return this.currentPath;
        }
    }

    async get(fileName) {
        if (raw) {
            console.log("get", fileName);
            let r = await super.get(fileName);
            console.log("get", fileName, r);
            return r;
        } else {
            let target = PathTool.resolve(this.currentPath, fileName);

            console.log("get", fileName, target);
            if (target === "/") {
                return {
                    name: "",
                    size: 0,
                    mode: 33206,
                    isDirectory: function () {
                        return true;
                    },
                    mtime: new Date()
                }
            }
            let f = await this.sfs.getFileInfo(target);
            return {
                name: f.fileName,
                size: f.size,
                mode: 33206,
                isDirectory: function () {
                    return f.fileUuid === null;
                },
                mtime: new Date(f.updatedAt)
            }
        }
    }


    async list(path) {
        if (raw) {
            let r = await super.list(path);
            return r;
        } else {
            let target = PathTool.resolve(this.currentPath, path);
            console.log("list", path, this.currentPath, target);
            let files = await this.sfs.listFiles(target);
            let result = files.map(f => {
                return {
                    name: f.fileName,
                    size: f.size,
                    mode: 33206,
                    isDirectory: function () {
                        return f.fileUuid === null;
                    },
                    mtime: new Date(f.updatedAt)
                }
            });
            console.log("list length", result.length);
            return result;
        }
    }

    async chdir(path) {
        if (raw) {
            let r = await super.chdir(path);
            console.log("chdir", path, r);
            return r;
        } else {
            console.log("chdir", path);
            this.currentPath = PathTool.resolve(path) + "/";
            console.log("chdir", path, this.currentPath);
            // let newFrom = PathTool.resolve(this.currentDirectory(), from);
            // let newTo = PathTool.resolve(this.currentDirectory(), to);
            // console.log("rename", from, to, newFrom, newTo);
            // await this.sfs.renameDir(newFrom, newTo);
        }
    }

    async mkdir(path) {
        if (raw) {
            // let r = await super.mkdir(path);
            // console.log("mkdir", path, r);
            // return r;
        } else {
            let newPath = PathTool.resolve(this.currentDirectory(), path);
            console.log("mkdir", path, newPath);
            await this.sfs.mkdir(newPath);
        }
    }

    async write(fileName, { append, start }) {
        if (raw) {
            let r = await super.write(fileName, { append, start });
            console.log("write", fileName, { append, start }, r);
            return r;
        } else {
            throw new Error("暂不支持写入" + append + "/" + start);
        }
    }

    async read(fileName, { start }) {
        if (raw) {
            let r = await super.read(fileName, { start });
            console.log("read", fileName, { start }, r);
            return r;
        } else {
            if (start === undefined) {
                let newPath = PathTool.resolve(this.currentDirectory(), fileName);
                console.log("read", fileName, { start });
                let data = await this.sfs.readFile(newPath);
                return Readable.from(data);
            } else {
                throw new Error("暂不支持指定位置读取功能");
            }
        }
    }


    async delete(fileName) {
        if (raw) {
            console.log("delete", fileName);
            let r = await super.delete(fileName);
            console.log("delete", fileName, r);
            return r;
        } else {
            let newPath = PathTool.resolve(this.currentDirectory(), fileName);
            console.log("delete", fileName, newPath);
            let info = await this.sfs.getFileInfo(newPath);
            if (info.fileUuid === null) {//dir
                await this.sfs.deldir(newPath);
            } else {
                await this.sfs.deleteFile(newPath);
            }
        }
    }

    async rename(from, to) {
        if (raw) {
            let r = await super.rename(from, to);
            console.log("rename", from, to, r);
            return r;
        } else {
            let newFrom = PathTool.resolve(this.currentDirectory(), from);
            let newTo = PathTool.resolve(this.currentDirectory(), to);
            console.log("rename", from, to, newFrom, newTo);
            let info = await this.sfs.getFileInfo(newFrom);
            if (info.fileUuid === null) {//dir
                await this.sfs.renameDir(newFrom, newTo);
            } else {
                await this.sfs.renameFile(newFrom, newTo);
            }
        }
    }

    async chmod(path) {
        if (raw) {
            console.log("chmod", path);
            let r = await super.chmod(path);
            console.log("chmod", path, r);
            return r;
        } else {
            throw new Error("暂不支持 chmod");
        }
    }

    getUniqueName(fileName) {
        console.log("getUniqueName", fileName);
        let r = super.getUniqueName(fileName);
        console.log("getUniqueName", fileName, r);
        return r;
    }

}

module.exports = FtpFileSystem;