let FileSystem = require("../FileSystem");
let nfs = require("fs");


let fs = new FileSystem("./test_data");
test("init", async () => {
    await fs.init();
})

test("writeFile", async () => {
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

    await fs.writeFile("/没有的文件夹/null.txt", "sss", { createDir: true });
    exists = await fs.existsFile("/没有的文件夹/null.txt");
    expect(exists).toBe(true);
    await fs.deleteFile("/没有的文件夹/null.txt");
    await fs.deldir("/没有的文件夹");
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

    await expect(async () => {
        await fs.mkdir("/data/dir4/dir5/dir6");
    }).rejects.toThrow("创建文件夹失败 找不到父文件夹");
    await fs.mkdir("/data/dir4/dir5/dir6", { recursive: true });
    expect(await fs.existsDir("/data/dir4/dir5/dir6")).toBe(true);
});

test("del dir", async () => {
    expect(await fs.readFileAsString("/data/test.txt")).toBe("TESTSTR");
    await fs.deldir("/data/");
    expect(await fs.existsDir("/data/")).toBe(false);
});


test("listFiles", async () => {
    let result = await fs.listFiles("/");
    console.log(result);
    expect(result.length).toBe(2);
    expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
    expect(result.filter(f => f.fullPath === "/GGGG.txt").length).toBe(1);
});

test("findFiles", async () => {
    let result = await fs.findFiles("read");
    expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
    result = await fs.findFiles("read", "nani");
    expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(0);

    await fs.mkdir("/search");
    await fs.writeFile("/search/test.txt", "TESTSTR");
    await fs.writeFile("/search/test2.txt", "TESTSTR");
    await fs.writeFile("/search/test3.txt", "TESTSTR");
    await fs.writeFile("test4.txt", "TESTSTR");
    await fs.findFiles("test");
    result = await fs.findFiles("test");
    expect(result.length).toBe(4);
    result = await fs.findFiles("test", "search");
    expect(result.length).toBe(3);
    result = await fs.findFiles("test", "/");
    expect(result.length).toBe(1);
    await fs.deldir("/search/");
    await fs.deleteFile("test4.txt");
});

test("findFilesByLike", async () => {
    try {
        let result = await fs.findFilesByLike("%read%txt%");
        expect(result.filter(f => f.fullPath === "/read.txt").length).toBe(1);
    } catch (error) {
        console.error(error);
        throw error;
    }


    await fs.mkdir("/search");
    await fs.writeFile("/search/test.txt", "TESTSTR");
    await fs.writeFile("/search/test2.txt", "TESTSTR");
    await fs.writeFile("/search/test3.txt", "TESTSTR");
    await fs.writeFile("test4.txt", "TESTSTR");
    await fs.findFiles("test");
    let result = await fs.findFilesByLike("%test%txt%");
    expect(result.length).toBe(4);
    result = await fs.findFilesByLike("%test%txt%", "search");
    expect(result.length).toBe(3);
    result = await fs.findFilesByLike("%test%txt%", "/");
    expect(result.length).toBe(1);
    await fs.deldir("/search/");
    await fs.deleteFile("test4.txt");
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

    await fs.batchWriteFiles([{ path: "/null/b1.txt", data: "TESTTEST2", options: { createDir: true } }, { path: "/null/b2.txt", data: "TESTTEST", options: { createDir: true } }]);
    expect(await fs.existsDir("/null/")).toBe(true);
    expect(await fs.readFileAsString("/null/b1.txt")).toBe("TESTTEST2");
    expect(await fs.readFileAsString("/null/b2.txt")).toBe("TESTTEST");
    await fs.deldir("/null/");
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

test("listFilesLimit", async () => {

    //先清空文件
    let all = await fs.listFiles();
    for (let i = 0; i < all.length; i++) {
        let f = all[i];
        await fs.deleteFile(f.fullPath);
    }
    all = await fs.listFiles();
    expect(all.length).toBe(0);

    //写入文件
    await fs.writeFile("/c.txt", "TESTTEST");
    await fs.writeFile("/a.txt", "TESTTEST");
    await fs.writeFile("/b.txt", "TESTTEST");
    await fs.writeFile("/d.txt", "TESTTEST");
    let listFiles = await fs.listFilesLimit("/", "", 3);
    expect(listFiles.length).toBe(3);
    expect(listFiles[0].fileName).toBe("a.txt");
    expect(listFiles[1].fileName).toBe("b.txt");
    expect(listFiles[2].fileName).toBe("c.txt");
    listFiles = await fs.listFilesLimit("/", "/a.txt", 3); 
    expect(listFiles.length).toBe(3);
    expect(listFiles[0].fileName).toBe("b.txt");
    expect(listFiles[1].fileName).toBe("c.txt");
    expect(listFiles[2].fileName).toBe("d.txt");

    await fs.mkdir("/test");
    await fs.writeFile("/test/c.txt", "TESTTEST");
    await fs.writeFile("/test/a.txt", "TESTTEST");
    await fs.writeFile("/test/b.txt", "TESTTEST");
    await fs.writeFile("/test/d.txt", "TESTTEST");
    listFiles = await fs.listFilesLimit("/test", "", 3);
    expect(listFiles.length).toBe(3);
    expect(listFiles[0].fileName).toBe("a.txt");
    expect(listFiles[1].fileName).toBe("b.txt");
    expect(listFiles[2].fileName).toBe("c.txt");
    listFiles = await fs.listFilesLimit("/test", "/test/a.txt", 3);
    expect(listFiles.length).toBe(3);
    expect(listFiles[0].fileName).toBe("b.txt");
    expect(listFiles[1].fileName).toBe("c.txt");
    expect(listFiles[2].fileName).toBe("d.txt");
    await fs.batchDeleteFiles(["/c.txt", "/a.txt", "/b.txt", "/d.txt", "/test/c.txt", "/test/a.txt", "/test/b.txt", "/test/d.txt"]);
    await fs.deldir("/test");

});