#!/usr/bin/env node
let SFS = require("../");

function getArgument(argName) {
    let index = process.argv.indexOf(argName);
    if (index === -1) {
        return null;
    }
    return process.argv[index + 1];
}

(async () => {

    let path = getArgument("--path");

    if (!path) {
        console.error("请指定存储路径 eg: sfs-test-data --path save_path");
        process.exit(-1);
    }
    let sfs = new SFS.FileSystem(path);
    await sfs.init();
    for (let i = 0; i < 100; i++) {
        await sfs.mkdir("/文件夹" + i);
        await sfs.writeFile("/文件夹" + i + "/test.txt", "test string" + i);
        await sfs.writeFile("/TXT" + i + ".txt", "test string" + i);
    }
    console.log("生成完成");

})();
 