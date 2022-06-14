const resolve = require('unix-path-resolve');


function parseFilePath(path) {
    let fullPath = resolve("/", path);
    let split = fullPath.split("/");
    let fileName = split[split.length - 1];
    let parentPath = split.slice(0, split.length - 1).join("/") + "/";
    let extension = (fileName.split(".")[1] || "").toLowerCase();
    return { fileName, parentPath, extension, fullPath, validate: !fullPath.endsWith("/") && !path.endsWith("/") && !path.endsWith("\\") };
}

function parseDirPath(path) {
    let fullPath = resolve("/", path) + "/";
    let split = fullPath.split("/");
    let fileName = split[split.length - 2];
    let parentPath = split.slice(0, split.length - 2).join("/") + "/";

    return { fullPath, fileName, parentPath };
}


module.exports = {
    parseFilePath,
    parseDirPath
}