let tools = require("../index");

test("lmdb commonkv", async () => {
    let base = tools.storage.openLMDBKvStorage("./test_data/test.lmdb");
    let kv = tools.storage.createCommonKV(base);
    await kv.set("k1", { a: 1 });
    await kv.set("k2", { a: 2 });
    expect((await kv.get("k1")).a).toBe(1);
    expect((await kv.get("k2")).a).toBe(2);
    await kv.set("k1", { a: 2 });
    expect((await kv.get("k1")).a).toBe(2);
});


test("level commonkv", async () => {
    let base = tools.storage.openLevelDBStorage("./test_data/test.level");
    let kv = tools.storage.createCommonKV(base);
    await kv.set("k1", { a: 1 });
    await kv.set("k2", { a: 2 });
    expect((await kv.get("k1")).a).toBe(1);
    expect((await kv.get("k2")).a).toBe(2);
    await kv.set("k1", { a: 2 });
    expect((await kv.get("k1")).a).toBe(2);
});


test("sqlite sequelize", async () => {
    let base = await tools.storage.sequelize.openSequelizeKVStorageSqliteMemory();
    let kv = tools.storage.createCommonKV(base);
    await kv.set("k1", { a: 1 });
    await kv.set("k2", { a: 2 });
    expect((await kv.get("k1")).a).toBe(1);
    expect((await kv.get("k2")).a).toBe(2);
    await kv.set("k1", { a: 2 });
    expect((await kv.get("k1")).a).toBe(2);
});