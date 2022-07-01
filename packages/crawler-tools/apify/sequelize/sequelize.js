const { Sequelize, Model, DataTypes } = require("sequelize");
let path = require("path");

async function buildSqliteSequelize(savePath) {
    let fullPath = path.resolve(savePath);
    let mainSqlitePath = path.resolve(fullPath);
    let opts = {
        dialect: "sqlite",
        storage: mainSqlitePath,
        logging: false
    };
    return await buildSequelize(opts);
}


async function buildSequelize(opts) {

    const sequelize = new Sequelize(opts);
    class RequestQueueRequests extends Model {
    }

    RequestQueueRequests.init({
        id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            primaryKey: true
        },
        orderNo: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        method: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        noRetry: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        handledAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        error: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        json: {
            type: DataTypes.JSON,
            allowNull: false
        }
    }, {
        sequelize: sequelize,
        indexes: [
            { fields: ["handledAt"], unique: false },
            { fields: ["orderNo"], unique: false },
            { fields: ["error"], unique: false }
        ]
        // timestamps: false
    });

    await RequestQueueRequests.sync();
    return RequestQueueRequests;
}


module.exports = {
    buildSequelize,
    buildSqliteSequelize
}