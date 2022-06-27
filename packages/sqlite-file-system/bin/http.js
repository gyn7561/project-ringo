#!/usr/bin/env node
let SFS = require("../");
let nodePath = require("path");

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

    if (!path) {
        console.error("请指定存储路径 eg: sfs-http --path save_path --port 8888");
        process.exit(-1);
    }
    if (!port) {
        port = 0;
    }
    console.log(nodePath.resolve(path));
    let s = new SFS.FileSystem(path);
    await s.init();
    SFS.createHttpServer(s, port);
})();
  