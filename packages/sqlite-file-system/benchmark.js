let fs = require("fs");
let sfs = require("./index");
let { gzip, ungzip } = require("node-gzip");
let uuid = require("uuid");
(async () => {

    fs.mkdirSync("test_data", { recursive: true });
    function randomData() {
        let str = "";
        for (let i = 0; i < 100; i++) {
            str += uuid.v4();
        }
        return str;
    }
    let start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        fs.writeFileSync("test_data/" + i + ".txt", await gzip(randomData()));
    }
    let end = new Date().getTime();
    console.log("写入文件 cost " + (end - start) + " ms");

    start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        fs.readFileSync("test_data/" + i + ".txt", "utf-8");
    }
    end = new Date().getTime();

    console.log("read文件 cost " + (end - start) + " ms");

    start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        fs.unlinkSync("test_data/" + i + ".txt");
    }
    end = new Date().getTime();
    console.log("DEL文件 cost " + (end - start) + " ms");
    let sqliteFs = new sfs.FileSystem("./test_data");
    await sqliteFs.init();
    await sqliteFs.saveData("a.txt", "sasa");
    await sqliteFs.deleteFile("a.txt");

    start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        await sqliteFs.saveData(i + ".txt", randomData());
    }

    end = new Date().getTime();
    console.log("sfs 写入文件 cost " + (end - start) + " ms");

    start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        await sqliteFs.readFileAsString(i + ".txt");
    }
    end = new Date().getTime();
    console.log("sfs read 文件 cost " + (end - start) + " ms");

    start = new Date().getTime();
    for (let i = 0; i < 1000; i++) {
        await sqliteFs.deleteFile(i + ".txt");
    }

    end = new Date().getTime();
    console.log("sfs del 文件 cost " + (end - start) + " ms");

})();
