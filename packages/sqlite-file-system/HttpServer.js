var express = require('express');
var bodyParser = require("body-parser");
var compression = require('compression');
// 当对主页发出 GET 请求时，响应“hello world”
let PathTool = require("./PathTool");

/**
 * 启动一个http服务器
 * @param {import("./FileSystem")} fs 
 * @param {number} port 
 */
module.exports = function (fs, port = 0) {
    var app = express();
    app.use(express.json());
    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: false }));

    function removeFields(result) {
        return result.map(o => {
            return {
                fullPath: o.fullPath,
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
                size: o.size
            }
        })
    }

    app.get('/', function (req, res) {
        res.send('Server start');
    });

    app.get("/listFiles", async (req, res) => {
        let parentPath = req.query.parentPath;
        let start = new Date().getTime();
        let result = await fs.listFiles(parentPath);
        let end = new Date().getTime();
        console.log("listFiles 耗时" + (end - start) + "ms");
        res.jsonp(removeFields(result));
    });

    app.get("/searchFiles", async (req, res) => {
        let search = req.query.search;
        console.log("searchFiles ", search);
        let start = new Date().getTime();
        let result = await fs.findFiles(search);
        let end = new Date().getTime();
        console.log("findFiles 耗时" + (end - start) + "ms");
        res.jsonp(removeFields(result));
    });

    app.get("/download", async (req, res) => {
        let key = req.query.key;
        let result = await fs.readFile(key);
        let { fileName } = PathTool.parseFilePath(key);
        console.log(fileName);
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));
        res.type('application/octet-stream');
        res.send(result);
    });

    app.get("/getFileAsString", async (req, res) => {
        let key = req.query.key;
        let result = await fs.readFileAsString(key);
        res.jsonp({ data: result });
    });

    let server = app.listen(port, function () {
        let addr = `http://localhost:${server.address().port}`;
        console.log('BatchArchive Http Server Listening on port ' + server.address().port + " " + addr);
        let uiUrl = `https://ringo-ui.vercel.app/SFS/${encodeURIComponent(addr)}/1/`;
        console.log("UI: " + uiUrl);
    });
}