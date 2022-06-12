let BatchArchive = require("../BatchArchive");
let B = require("../index");

let fs = require("fs");

const uuid = require("uuid");
(async () => {
    function rndData() {
        let str = "";
        for (let i = 0; i < 1000; i++) {
            str += uuid.v4();
        }
        return str;
    }
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });

    await batchArchive.init();
    await batchArchive.writeFile(`test.txt`, "teststr");
    for (let i = 0; i < 1001; i++) {
        await batchArchive.writeFile(`G-${i}.txt`, rndData());
    }
    await batchArchive.writeFile(`JSON.json`, `{"a":1,"test":"1111"}`);
    await batchArchive.writeFile("html.html", `<html>48dfs56dsf645sdf465<body><div></div></body></html>`)
    await batchArchive.finalize();
    let str = await batchArchive.readFileAsString("test.txt");
    console.log(str);
    B.createHttpSearver(batchArchive, 14797);
    // await batchArchive.kv.close();
})();