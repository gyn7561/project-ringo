let SFS = require("../");

(async () => {
    let s = new SFS.FileSystem("./test");
    await s.init();
    SFS.createHttpServer(s, 13365);
})();
