#!/usr/bin/env node
let SFS = require("../");
let nodePath = require("path");
let fs = require("fs");
let AsyncLock = require("async-lock");

function getArgument(argName) {
    let index = process.argv.indexOf(argName);
    if (index === -1) {
        return null;
    }
    return process.argv[index + 1];
}

(async () => {

    let path = getArgument("--path");
    let port = getArgument("--port");
    let groupConfig = getArgument("--group-config");

    if (!path && !groupConfig) {
        console.error("请指定存储路径 eg: sfs-http --path save_path --port 8888");
        console.error("或者指定组路径 eg: sfs-http --path save_path --group-config config.json");
        process.exit(-1);
    }

    if (!port) {
        port = 0;
    }
    if (path) {
        console.log(nodePath.resolve(path));
        let s = new SFS.FileSystem(path);
        await s.init();
        SFS.createHttpServer(s, port);
    } else if (groupConfig) {
        console.log(nodePath.resolve(groupConfig));
        if (!fs.existsSync(nodePath.resolve(groupConfig))) {
            console.log("找不到配置文件");
            process.exit(-1);
        }
        let configJson = JSON.parse(fs.readFileSync(nodePath.resolve(groupConfig), "utf8"));

        let sfsMap = new Map();

        fs.watchFile(nodePath.resolve(groupConfig), (c, p) => {
            console.log("检测到配置文件更改");
            configJson = JSON.parse(fs.readFileSync(nodePath.resolve(groupConfig), "utf8"));
            sfsMap.forEach((fs) => {
                fs.close();
            })
            sfsMap.clear();
        });

        let lock = new AsyncLock();

        async function lockRun(key, promise) {
            return await lock.acquire(key, (done) => {
                promise.then((ret) => {
                    done(null, ret);
                }).catch(e => {
                    done(e, null);
                })
            })
        }

        async function getFs(id) {
            if (sfsMap.has(id)) {
                return sfsMap.get(id);
            }
            let path = null;
            configJson.sp = configJson.sp || {};
            if (configJson.sp[id]) {
                path = nodePath.resolve(configJson.sp[id]);
            } else if (configJson.path) {
                path = nodePath.resolve(configJson.path);
                path = nodePath.resolve(path, id);
            } else {
                return null;
            }
            let mainSqlPath = nodePath.resolve(path, "main.sqlite.db");
            if (!fs.existsSync(mainSqlPath)) {
                console.log("不存在" + mainSqlPath);
                return null;
            }
            console.log("初始化" + path);
            let s = new SFS.FileSystem(path);
            await s.init();
            sfsMap.set(id, s);
            return s;
        }

        async function getFsLock(id) {
            return await lockRun(id, getFs(id));
        }

        SFS.createHttpServer(getFsLock, port);

    }

})();
