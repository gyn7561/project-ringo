//https://github.com/jaredwray/keyv/tree/main/packages/keyv
const Keyv = require('keyv');
const path = require("path");
function createKeyv(opts) {
    return new Keyv(opts);
}

function createKeyvSqlite(sqlitePath) {
    let abPath = path.resolve(sqlitePath);
    return new Keyv(`sqlite://${abPath}`);
}

function createKeyvMemory() {
    return new Keyv();
}


function createKeyvMongo(mongoConnectString) {
    return new Keyv(mongoConnectString);
}

module.exports = {
    createKeyv,
    createKeyvSqlite,
    createKeyvMemory,
    createKeyvMongo
}