
let fs = require("fs");
const xlsx = require("node-xlsx");

function convertToArray(array) {
    let result = [[]];
    let header = result[0];
    let headerMap = new Map();
    for (let i = 0; i < array.length; i++) {
        let item = array[i];
        let item2 = [];
        for (const key in item) {
            if (!headerMap.has(key)) {
                header.push(key);
                headerMap.set(key, header.length - 1);
            }
            item2[headerMap.get(key)] = item[key];
        }
        result.push(item2);
    }
    return result;
}

/**
 * 
 * @param {String} path 保存路径
 * @param {*} array 数据
 */
function saveToExcel(path, array) {
    var buffer = xlsx.build([{ name: 'data', data: convertToArray(array) }]);
    fs.writeFileSync(path, buffer);
}

/**
 * 
 * @param {*} pathFunc 保存路径的函数(num)=>path
 * @param {*} splitSize 每个EXCEL多少行
 * @returns 
 */
function saveToExcelSequence(pathFunc, splitSize) {
    let arrayList = [];
    let count = 1;
    function pushData(data) {
        arrayList.push(data);
        if (arrayList.length === splitSize) {
            saveToExcel(pathFunc(count), arrayList);
            arrayList = [];
            count++;
        }
    }
    function finish() {
        if (arrayList.length > 0) {
            saveToExcel(pathFunc(count), arrayList);
        }
    }
    return [pushData, finish];
}


module.exports = {
    saveToExcel,
    saveToExcelSequence
}