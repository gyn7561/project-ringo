var log4js = require("log4js");

module.exports = {
    fetch: require("./fetch"),
    extract: require("./extract"),
    sleep: function (time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    },
    logger: log4js.getLogger(),
    storage: require("./storage"),
    excel: require("./excel")
};