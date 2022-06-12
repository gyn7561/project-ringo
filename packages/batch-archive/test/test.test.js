let BatchArchive = require("../BatchArchive");
let fs = require("fs");

const uuid = require("uuid");

// fs.unlinkSync("./test_data/batch_archive_test");

test("init", () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
});

jest.setTimeout(10000);

test("common test", async () => {
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
    await batchArchive.finalize();
    let str = await batchArchive.readFileAsString("test.txt");
    expect(str).toBe("teststr");
    await batchArchive.kv.close();
});

test("read file 1", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    let str = await batchArchive.readFileAsString("G-0.txt");
    console.log(str.length);
    await batchArchive.kv.close();
});


test("read file 999", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    let str = await batchArchive.readFileAsString("G-999.txt");
    console.log(str.length);
    await batchArchive.kv.close();
});


test("delete file 999", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    await batchArchive.deleteFile("G-999.txt");
    await batchArchive.kv.close();
});

test("update file 998", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    await batchArchive.updateFile("G-998.txt", "update");
    await batchArchive.finalize();
    await batchArchive.kv.close();
});


test("test file test.txt", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    let str = await batchArchive.readFileAsString("test.txt");
    expect(str).toBe("teststr");
    await batchArchive.kv.close();
});

test("test files list", async () => {
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" });
    await batchArchive.init();
    let files = await batchArchive.listFiles("G", 100);
    console.log(files);
    expect(files.length).toBe(100);
    expect(files.includes("G-1000.txt")).toBe(true);
    files = await batchArchive.searchFiles("G-10", 1000);
    console.log(files);
    expect(files.includes("G-1000.txt")).toBe(true);
    await batchArchive.close();

});
