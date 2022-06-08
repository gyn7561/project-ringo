async function fetchJson(page, url, config) {
    let json = await page.evaluate(async (url, config) => {
        let res = await fetch(url, config);
        return await res.json();
    }, url, config);
    return json;
}

async function fetchText(page, url, config) {
    let text = await page.evaluate(async (url, config) => {
        let res = await fetch(url, config);
        return await res.text();
    }, url, config);
    return text;
}

module.exports = {
    fetchJson,
    fetchText
}