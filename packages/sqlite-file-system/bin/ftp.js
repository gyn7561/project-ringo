#!/usr/bin/env node
let SFS = require("../");
let nodePath = require("path");
const FtpSrv = require('ftp-srv');

function getArgument(argName) {
    let index = process.argv.indexOf(argName);
    if (index === -1) {
        return null;
    }
    return process.argv[index + 1];
}


(async () => {


    let path = getArgument("--path");
    let port = parseInt(getArgument("--port") || 21);

    if (!path) {
        console.error("请指定存储路径 eg: sfs-ftp --path save_path --port 21");
        process.exit(-1);
    }
    let sfs = new SFS.FileSystem(path);
    await sfs.init();
    let fs = new SFS.FtpFileSystem(sfs);

    const ftpServer = new FtpSrv({
        url: "ftp://0.0.0.0:" + port,
        anonymous: true,
    });

    ftpServer.on('login', (data, resolve, reject) => {
        // console.log("login", data);
        if (data.username === 'anonymous') {
            return resolve({ root: "/", fs: fs });
        }
        return reject(new errors.GeneralError('Invalid username or password', 401));
    });

    ftpServer.listen().then(() => {
        console.log('Ftp server is starting...')
    });
})();
 