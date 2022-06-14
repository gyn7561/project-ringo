let FileSystem = require("./FileSystem");
let nfs = require("fs");

(async () => {
    let fs = new FileSystem("./test");
    await fs.init();
    await fs.writeFile("//GGGG.txt", "sdadasdshhdbshb");
})();