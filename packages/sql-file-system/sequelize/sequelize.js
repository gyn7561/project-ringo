let { Sequelize, Model, DataTypes } = require("sequelize");


async function init(options) {

    const sequelize = new Sequelize(options);


    class Files extends Model {
        isDir() {
            return this.fullPath.endsWith("/");
        }
    }

    Files.init({
        fullPath: {
            type: DataTypes.STRING(255),
            primaryKey: true,
        },
        parentPath: DataTypes.STRING.STRING(255),
        size: DataTypes.INTEGER,
        storagePosition: DataTypes.STRING(32),
        fileUuid: DataTypes.STRING(32)
    }, {
        sequelize: sequelize,
        indexes: [{ fields: "parentPath", unique: false }]
    });


    const Info = sequelize.define('FILES', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        info: DataTypes.JSON
    });

    await Files.sync();
    await Info.sync();

    return { Files, Info };
}