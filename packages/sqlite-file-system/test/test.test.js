let FileSystem = require("../FileSystem");
let nfs = require("fs");


let fs = new FileSystem("./test_data");
test("init", async () => {
    await fs.init();

})

test("save", async () => {
    await fs.writeFile("/GGGG.txt", "TESTTEST");
    let exists = await fs.exists("/NOT_EXISTS.txt");
    expect(exists).toBe(false);
    exists = await fs.exists("/GGGG.txt");
    expect(exists).toBe(true);
});

test("delete", async () => {
    await fs.writeFile("/delete.txt", "sdadasdshhdbshb");
    let exists = await fs.exists("/delete.txt");
    expect(exists).toBe(true);
    await fs.deleteFile("/delete.txt");
    exists = await fs.exists("/delete.txt");
    expect(exists).toBe(false);
})

test("read", async () => {
    await fs.writeFile("/read.txt", "TESTSTR");
    let exists = await fs.exists("/read.txt");
    expect(exists).toBe(true);
    let data = await fs.readFileAsString("/read.txt");
    expect(data).toBe("TESTSTR");
})

test("mkdir", async () => {
    await fs.mkdir("/data");
    await fs.writeFile("/data/test.txt", "TESTSTR");
    // expect(result.map(s => s.fileName).length).toBe(1);
});

test("listFiles", async () => {
    let result = await fs.listFiles("/");
    expect(result.map(s => s.fileName).length).toBe(3);
});

test("findFiles", async () => {
    let result = await fs.findFiles("read");
    expect(result.map(s => s.fileName).length).toBe(1);
});

