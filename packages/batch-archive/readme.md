#### 大量小文本文件本地存储解决方案

通过批量打zip包的方式存储文件

```
let { BatchArchive } = require("@ringoc/batch-archive"); 

(async()=>{
    function rndData() {
        let str = "";
        for (let i = 0; i < 1000; i++) {
            str += "test_test_test";
        }
        return str;
    }
    let batchArchive = new BatchArchive({ saveDirPath: "./test_data/batch_archive_test" }); 
    await batchArchive.init(); 
    for (let i = 0; i < 1001; i++) {
        await batchArchive.writeFile(`G-${i}.txt`, rndData());
    }
    await batchArchive.finalize();
    await batchArchive.close();
})();

```