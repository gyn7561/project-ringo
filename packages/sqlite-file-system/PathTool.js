const resolve = require('unix-path-resolve');


function parseFilePath(path) {
    let fullPath = resolve("/", path);
    let split = fullPath.split("/");
    let fileName = split[split.length - 1];
    let parentPath = split.slice(0, split.length - 1).join("/");
    let extension = (fileName.split(".")[1] || "").toLowerCase();
    if (parentPath === "") {
        parentPath = null;
    }
    return { fileName, parentPath, extension, fullPath, validate: !fullPath.endsWith("/") && !path.endsWith("/") && !path.endsWith("\\") };
}


function parseDirPath(path) {
    let fullPath = resolve("/", path);
    if (fullPath === "/") {//根目录特殊处理
        return { fullPath: null, fileName: "", parentPath: null };
    }
    let split = fullPath.split("/");
    let fileName = split[split.length - 1];
    let parentPath = split.slice(0, split.length - 1).join("/");
    if (parentPath === "") {
        parentPath = null;
    }
    return { fullPath, fileName, parentPath };
}


module.exports = {
    parseFilePath,
    parseDirPath,
    resolve
}
