let { Sequelize, Model, DataTypes } = require("sequelize");

/**
 * @beta
 * @param {*} options 
 * @returns 
 */
async function openSequelizeFileStorage(options) {
    const sequelize = new Sequelize(options);
    const FILE = sequelize.define('FILES', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        data: DataTypes.BLOB
    });
    await FILE.sync();
    return FILE;
}

//https://github.com/jaredwray/keyv  备选方案 

async function openSequelizeKVStorage(options) {
    const sequelize = new Sequelize(options);
    const KV = sequelize.define('KV', {
        key: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        value: DataTypes.JSON
    });
    await KV.sync();
    return KV;
}

async function openSequelizeKVStorageSqliteMemory() {
    return await openSequelizeKVStorage('sqlite::memory:');
}

async function openSequelizeKVStorageSqlite(path, options) {
    return await openSequelizeKVStorage({
        dialect: 'sqlite',
        storage: path
    });
}

module.exports = {
    openSequelizeKVStorage,
    openSequelizeKVStorageSqliteMemory,
    openSequelizeKVStorageSqlite,
    openSequelizeFileStorage
}