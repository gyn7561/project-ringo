var express = require('express');
var bodyParser = require("body-parser");
// 当对主页发出 GET 请求时，响应“hello world”


module.exports = function (batchArchive, port = 0) {
    var app = express();
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    app.get('/', function (req, res) {
        res.send('Server start');
    });

    app.get("/listFiles", async (req, res) => {
        let start = req.query.start;
        let limit = parseInt(req.query.limit);
        console.log("listFiles ", start, limit);
        let result = await batchArchive.listFiles(start, limit);
        res.jsonp(result);
    });

    app.get("/searchFiles", async (req, res) => {
        let search = req.query.search;
        console.log("searchFiles ", search);
        let result = await batchArchive.searchFiles(search);
        res.jsonp(result);
    });

    app.get("/download", async (req, res) => {
        let key = req.query.key;
        let result = await batchArchive.readFile(key);
        res.setHeader('Content-Disposition', 'attachment; filename=' + key);
        res.type('application/octet-stream');
        res.send(result);
    });

    app.get("/getFileAsString", async (req, res) => {
        let key = req.query.key;
        let result = await batchArchive.readFileAsString(key);
        res.jsonp({ data: result });
    });

    let server = app.listen(port, function () {
        let addr = `http://localhost:${server.address().port}`;
        console.log('BatchArchive Http Server Listening on port ' + server.address().port + " " + addr);
        let uiUrl = `https://ringoc-ui.vercel.app/BatchArchive/${encodeURIComponent(addr)}/1/`;
        console.log("UI: " + uiUrl);
    });
}