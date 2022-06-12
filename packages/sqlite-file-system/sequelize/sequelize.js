let { Sequelize, Model, DataTypes } = require("sequelize");
let path = require("path");
let fs = require("fs");

async function initVol(savePath, id) {
    let fullPath = path.resolve(savePath);
    let volSqlitePath = path.resolve(fullPath, `${id}.sqlite.db`);
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: volSqlitePath
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
    return Storage;
}

async function initMain(savePath) {
    let fullPath = path.resolve(savePath);
    let mainSqlitePath = path.resolve(fullPath, "main.sqlite.db");
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: mainSqlitePath
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
        size: DataTypes.INTEGER,
        storagePosition: DataTypes.STRING(255),
        fileUuid: DataTypes.STRING(32)
    }, {
        sequelize: sequelize,
        indexes: [{ fields: ["parentPath"], unique: false }]
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

    return { Files, Info };
}

module.exports = {
    initMain,
    initVol
}