
class CommonKV {
    constructor(base, type) {
        this.type = type;
        this.base = base;
        if (!this.type) { //自动识别
            if (this.base.sequelize) {
                this.type = "sequelize"
            } else if (this.base.getKeysCount) {
                this.type = "lmdb"
            } else if (this.base.getMaxListeners) {
                this.type = "level"
            } else {
                throw new Error("未知的KV数据库类型", base);
            }
        }
    }


    async set(key, value) {
        switch (this.type) {
            case "sequelize":
                return await this.base.upsert({ key: key, value: value });
            case "lmdb":
                return await this.base.put(key, value);
            case "level":
                return await this.base.put(key, value);
        }
    }

    async get(key) {
        switch (this.type) {
            case "sequelize":
                let result = await this.base.findByPk(key);
                return result.getDataValue("value");
            case "lmdb":
                return await this.base.get(key);
            case "level":
                return await this.base.get(key);
        }
    }

}

module.exports = CommonKV;