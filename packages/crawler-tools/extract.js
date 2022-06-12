const cheerio = require('cheerio');


async function extractAttrByCss(pageOrHtml, attrList, css) {
    let isHtml = typeof (pageOrHtml) === "string";

    let isCheerio = pageOrHtml.parseHTML && pageOrHtml.html;

    if (isHtml || isCheerio) {
        let $ = pageOrHtml;
        if (isHtml) {
            $ = cheerio.load(pageOrHtml);
        }
        let list = [];
        let aList = $(css);
        for (let i = 0; i < aList.length; i++) {
            let dom = aList[i];
            let obj = {};
            for (let j = 0; j < attrList.length; j++) {
                let attrName = attrList[j];
                if (attrName === "text") {
                    obj[attrName] = $(dom).text();
                } else if (attrName === "html") {
                    obj[attrName] = $(dom).html();
                }
                else {
                    obj[attrName] = $(dom).attr(attrName);
                }
            }
            list.push(obj);
        }
        return list;
    } else {
        //浏览器
        let page = pageOrHtml;
        let result = await page.evaluate((attrList, css) => {
            // let currentArea = $(".link-district").text().trim();
            let list = [];
            let aList = document.querySelectorAll(css);
            for (let i = 0; i < aList.length; i++) {
                let dom = aList[i];
                let obj = {};
                for (let j = 0; j < attrList.length; j++) {
                    let attrName = attrList[j];
                    if (attrName === "text") {
                        obj[attrName] = dom.textContent;
                    } else {
                        obj[attrName] = dom.getAttribute(attrName);
                    }
                }
                list.push(obj);
            }
            console.log({ attrList, css }, aList, list, "extractAttrByCss");
            return list;
        }, attrList, css);
        return result;
    }

}


async function extractAllUrls(pageOrHtml, baseUrl) {
    let allLinks = await extractAttrByCss(pageOrHtml, ["href"], "a");
    let result = [];
    for (let i = 0; i < allLinks.length; i++) {
        let link = allLinks[i];
        result.push(new URL(link.href, baseUrl).toString());
    }
    return result;
}

async function extractAttrByCssSingle(pageOrHtml, attrList, css) {
    let array = await extractAttrByCss(pageOrHtml, attrList, css);
    return array[0];
}

async function extractSingleAttrByCss(pageOrHtml, attr, css) {
    let array = await extractAttrByCss(pageOrHtml, [attr], css);
    return array.map(d => d[attr]);
}


async function extractSingleAttrByCssSingle(pageOrHtml, attr, css) {
    let array = await extractSingleAttrByCss(pageOrHtml, attr, css);
    return array[0];
}


module.exports = {
    cheerio,
    extractAttrByCss, extractAllUrls, extractAttrByCssSingle,
    extractSingleAttrByCss, extractSingleAttrByCssSingle
}