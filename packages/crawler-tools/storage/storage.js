
var CommonKV = require('./commonKV');

/**
 * LMDB 内存型KV数据库,默认压缩,适合跑一些数据不算很大的数据
 * @param {*} path 
 * @param {*} opt 
 * @returns 
 */
function openLMDBKvStorage(path, opt) {
    var lmdb = require('lmdb');
    let myDB = lmdb.open({
        path: path,
        compression: true,
        ...opt
    });
    return myDB;
}

/**
 * Google的LevelDB KV数据库 适合存储大量数据
 * https://github.com/Level/level
 * @param {*} path
 * @param {*} opt
 */
function openLevelDBStorage(path, opt) {
    const { Level } = require('level');
    const db = new Level(path, {
        valueEncoding: 'json',
        ...opt
    })
    return db;
}

function createCommonKV(base, type) {
    return new CommonKV(base, type);
}

module.exports = {
    openLMDBKvStorage,
    openLevelDBStorage,
    createCommonKV,
    sequelize: require("./sequelize"),
    keyv: require("./keyv"),
    minio: require("./minio/minio")
};