let tools = require("../index");

test("memory kv", async () => {
    let KV = await tools.storage.sequelize.openSequelizeKVStorageSqliteMemory(); 
    await KV.create({ key: "key", value: { a: 1 } });
    await KV.create({ key: "key2", value: "value" });
    let value = await KV.findByPk("key");
    let realValue = value.getDataValue("value");
    let value2 = await KV.findByPk("key2");
    let realValue2 = value2.getDataValue("value");
    console.log(realValue)
    console.log(realValue2)
    expect(realValue.a).toBe(1);
    expect(realValue2).toBe("value");
})

test("sqlite kv", async () => {
    let KV = await tools.storage.sequelize.openSequelizeKVStorageSqlite("./test_data/test.db");
    await KV.upsert({ key: "key", value: { a: 1 } });
    let value = await KV.findByPk("key");
    let realValue = value.getDataValue("value");
    console.log(realValue)
    expect(realValue.a).toBe(1);
})
