var AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
var AsyncLock = require('async-lock');
let tools = require("@ringoc/crawler-tools");
let logger = tools.logger;

class BatchArchive {

    constructor({ saveDirPath, onePackageFiles = 1000 }) {
        this.saveDirPath = path.resolve(saveDirPath);
        this.onePackageFiles = onePackageFiles;
        this.version = "0.0.1";
    }

}

module.exports = BatchArchive;