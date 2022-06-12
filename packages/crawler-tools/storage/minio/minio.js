const readFileSync = require('fs').readFileSync;
const execSync = require('child_process').execSync;
const path = require("path");
const fs = require("fs");
var Minio = require('minio')

function startMinioServerSync({ dataPath, port, user = "ringo", password = "ringoringo" }) {
    process.env.MINIO_ROOT_USER = user;
    process.env.MINIO_ROOT_PASSWORD = password;
    execSync(`minio server "${dataPath}" --console-address ":${port + 1}" --address :${port}`, { stdio: 'inherit' })
}

function startMinioServerFromConfigFileSync() {
    let jsonFile = fs.readFileSync("./minio_config.json", { encoding: "utf-8" });
    let jsonObj = JSON.parse(jsonFile);
    startMinioServerSync(jsonObj);
}

function createMinioClient(options) {
    var minioClient = new Minio.Client(options);
    return minioClient;
}

function createMinioClientFromConfigFile() {
    let jsonFile = fs.readFileSync("./minio_config.json", { encoding: "utf-8" });
    let jsonObj = JSON.parse(jsonFile);
    // console.log(jsonObj.client);
    var minioClient = new Minio.Client(jsonObj.client);
    return minioClient;
}



module.exports = {
    startMinioServerSync,
    startMinioServerFromConfigFileSync,
    createMinioClient,
    createMinioClientFromConfigFile
}