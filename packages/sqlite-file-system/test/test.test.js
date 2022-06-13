let FileSystem = require("../FileSystem");
let nfs = require("fs");


let fs = new FileSystem("./test");
test("init", async () => {
    await fs.init();
    await fs.saveData("/GGGG.txt", "sdadasdshhdbshb");
    let exists = await fs.exists("/GGGG1111.txt");
    expect(exists).toBe(false);
    exists = await fs.exists("/GGGG.txt");
    expect(exists).toBe(true);
})

test("delete", async () => {
    await fs.saveData("/delete.txt", "sdadasdshhdbshb");
    let exists = await fs.exists("/delete.txt");
    expect(exists).toBe(true);
    await fs.deleteFile("/delete.txt");
    exists = await fs.exists("/delete.txt");
    expect(exists).toBe(false);
})

test("read", async () => {
    await fs.saveData("/read.txt", "TESTSTR");
    let exists = await fs.exists("/read.txt");
    expect(exists).toBe(true);
    let data = await fs.readFileAsString("/read.txt");
    expect(data).toBe("TESTSTR");
})

test("listFiles", async () => {
    let result = await fs.listFiles("/");
    console.log(result);
})

test("findFiles", async () => {
    let result = await fs.findFiles("read");
    console.log(result);
})
