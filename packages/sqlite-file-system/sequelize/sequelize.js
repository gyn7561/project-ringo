let { Sequelize, Model, DataTypes } = require("sequelize");
let path = require("path");
let fs = require("fs");

async function initVol(savePath, id) {
    let fullPath = path.resolve(savePath);
    let volSqlitePath = path.resolve(fullPath, `${id}.sqlite.db`);
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: volSqlitePath,
        logging: false
    });
    const Storage = sequelize.define('Storage', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        data: {
            type: DataTypes.BLOB("long"),
            allowNull: false
        }
    });
    await Storage.sync();
    await Storage.sequelize.query(`PRAGMA journal_mode = WAL;`);
    return Storage;
}

async function initMain(savePath) {
    let fullPath = path.resolve(savePath);
    let mainSqlitePath = path.resolve(fullPath, "main.sqlite.db");
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: mainSqlitePath,
        logging: false
    });
    class Files extends Model {
        isDir() {
            return this.fullPath.endsWith("/");
        }
    }

    Files.init({
        fullPath: {
            type: DataTypes.STRING(255),
            allowNull: false,
            primaryKey: true,
        },
        parentPath: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        fileName: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        size: DataTypes.INTEGER,
        storagePosition: DataTypes.STRING(255),
        fileUuid: DataTypes.STRING(32)
    }, {
        sequelize: sequelize,
        indexes: [{ fields: ["parentPath"], unique: false }, { fields: ["fileName"], unique: false }]
    });

    const Info = sequelize.define('Info', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        info: DataTypes.JSON
    });

    await Files.sync();
    await Info.sync();
    await Files.sequelize.query(`PRAGMA journal_mode = WAL;`);
    return { Files, Info };
}

module.exports = {
    initMain,
    initVol
}