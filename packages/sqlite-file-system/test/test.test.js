let FileSystem = require("../FileSystem");
let nfs = require("fs");


let fs = new FileSystem("./test_data");
test("init", async () => {
    await fs.init();
})

test("save", async () => {
    await fs.writeFile("/GGGG.txt", "TESTTEST");
    await expect(async () => {
        await fs.writeFile("/没有的文件夹/null.txt", "sss");
    }).rejects.toThrow("写入文件失败，可能是没有父文件夹");
    let exists = await fs.existsFile("/NOT_EXISTS.txt");
    expect(exists).toBe(false);
    exists = await fs.existsFile("/GGGG.txt");
    expect(exists).toBe(true);
    exists = await fs.existsFile("/没有的文件夹/null.txt");
    expect(exists).toBe(false);
});

test("delete", async () => {
    await fs.writeFile("/delete.txt", "sdadasdshhdbshb");
    let exists = await fs.existsFile("/delete.txt");
    expect(exists).toBe(true);
    await fs.deleteFile("/delete.txt");
    exists = await fs.existsFile("/delete.txt");
    expect(exists).toBe(false);

    await expect(async () => {
        await fs.deleteFile("/没有的文件夹/null.txt");
    }).rejects.toThrow("找不到文件");

    await expect(async () => {
        await fs.deleteFile("");
    }).rejects.toThrow("文件路径不合法");

})


test("read", async () => {
    await fs.writeFile("/read.txt", "TESTSTR");
    let exists = await fs.existsFile("/read.txt");
    expect(exists).toBe(true);
    let data = await fs.readFileAsString("read.txt");
    expect(data).toBe("TESTSTR");

    await expect(async () => {
        await fs.readFileAsString("不存在的文件.txt");
    }).rejects.toThrow("找不到文件");

})

test("mkdir", async () => {
    await fs.mkdir("/data");
    expect(await fs.existsDir("/data")).toBe(true);
    expect(await fs.existsDir("/data/")).toBe(true);
    expect(await fs.existsDir("/data不存在/")).toBe(false);
    await fs.writeFile("/data/test.txt", "TESTSTR");
    expect(await fs.readFileAsString("/data/test.txt")).toBe("TESTSTR");
    await fs.mkdir("/data/dir1");
    await fs.writeFile("/data/dir1/test.txt", "TESTSTR");
    expect(await fs.readFileAsString("/data/dir1/test.txt")).toBe("TESTSTR");
    await fs.mkdir("/data/dir1/dir2");
    await fs.writeFile("/data/dir1/dir2/test.txt", "TESTSTR");
    expect(await fs.readFileAsString("/data/dir1/dir2/test.txt")).toBe("TESTSTR");
    await fs.mkdir("/data/dir3");
    await fs.writeFile("/data/dir3/test.txt", "TESTSTR");
    expect(await fs.readFileAsString("/data/dir3/test.txt")).toBe("TESTSTR");
});

test("del dir", async () => {
    expect(await fs.readFileAsString("/data/test.txt")).toBe("TESTSTR");
    await fs.deldir("/data/");
    expect(await fs.existsDir("/data/")).toBe(false);
});


test("listFiles", async () => {
    let result = await fs.listFiles("/");
    expect(result.length).toBe(2);
    expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
    expect(result.filter(f => f.fullPath === "/GGGG.txt").length).toBe(1);
});

test("findFiles", async () => {

    let result = await fs.findFiles("read");
    expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
});

test("findFilesByLike", async () => {
    try {
        let result = await fs.findFilesByLike("%read%txt%");
        expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
    } catch (error) {
        console.error(error);
        throw error;
    }
});


test("batchWrite", async () => {
    await fs.batchWriteFiles([{ path: "/b1.txt", data: "TESTTEST" }, { path: "/b2.txt", data: "TESTTEST" }]);
    let b1Data = await fs.readFileAsString("/b1.txt");
    expect(b1Data).toBe("TESTTEST");
    await fs.batchWriteFiles([{ path: "/b1.txt", data: "TESTTEST2" }, { path: "/b2.txt", data: "TESTTEST" }]);
    b1Data = await fs.readFileAsString("/b1.txt");
    expect(b1Data).toBe("TESTTEST2");
    await expect(async () => {
        await fs.batchWriteFiles([{ path: "/null/b1.txt", data: "TESTTEST" }, { path: "/null/b2.txt", data: "TESTTEST" }]);
    }).rejects.toThrow();
});

test("batchDelete", async () => {
    expect(await fs.existsFile("/b1.txt")).toBe(true);
    expect(await fs.existsFile("/b2.txt")).toBe(true);
    await fs.batchDeleteFiles(["/b1.txt", "./b2.txt"]);
    expect(await fs.existsFile("/b1.txt")).toBe(false);
    expect(await fs.existsFile("/b2.txt")).toBe(false);
});

test("batchRename", async () => {
    await fs.batchWriteFiles([{ path: "/b1.txt", data: "TESTTEST" }, { path: "/b2.txt", data: "TESTTEST" }]);
    await fs.batchRenameFiles([{ from: "/b1.txt", to: "/b3.txt" }, { from: "/b2.txt", to: "/b4.txt" }]);
    expect(await fs.existsFile("/b3.txt")).toBe(true);
    expect(await fs.existsFile("/b4.txt")).toBe(true);
    await fs.batchDeleteFiles(["/b3.txt", "./b4.txt"]);
});

test("batchRenameDir", async () => {
    await fs.mkdir("/data");
    await fs.mkdir("/data/data2");
    await fs.mkdir("/data/data3");
    await fs.batchWriteFiles([{ path: "/data/b1.txt", data: "TESTTEST" }, { path: "/data/b2.txt", data: "TESTTEST" }]);
    await fs.batchWriteFiles([{ path: "/data/data2/b1.txt", data: "TESTTEST" }, { path: "/data/data2/b2.txt", data: "TESTTEST" }]);
    await fs.batchWriteFiles([{ path: "/data/data3/b1.txt", data: "TESTTEST" }, { path: "/data/data3/b2.txt", data: "TESTTEST" }]);
    expect(await fs.existsFile("/data/b1.txt")).toBe(true);
    expect(await fs.existsFile("/data/b2.txt")).toBe(true);
    expect(await fs.existsFile("/data/data2/b1.txt")).toBe(true);
    expect(await fs.existsFile("/data/data2/b2.txt")).toBe(true);
    expect(await fs.existsFile("/data/data3/b1.txt")).toBe(true);
    expect(await fs.existsFile("/data/data3/b2.txt")).toBe(true);
    await fs.renameDir("/data", '/new');
    expect(await fs.existsFile("/new/b1.txt")).toBe(true);
    expect(await fs.existsFile("/new/b2.txt")).toBe(true);
    expect(await fs.existsFile("/new/data2/b1.txt")).toBe(true);
    expect(await fs.existsFile("/new/data2/b2.txt")).toBe(true);
    expect(await fs.existsFile("/new/data3/b1.txt")).toBe(true);
    expect(await fs.existsFile("/new/data3/b2.txt")).toBe(true);
    await fs.deldir("/new");
    expect(await fs.existsFile("/new/b1.txt")).toBe(false);
    expect(await fs.existsFile("/new/data2/b1.txt")).toBe(false);
    expect(await fs.existsFile("/new/data3/b1.txt")).toBe(false);
});

