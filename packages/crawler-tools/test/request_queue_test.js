let Apify = require("apify");
let fs = require("fs");
let AxiosRawCrawler = require("../apify/AxiosRawCrawler");
let MDRequestQueue = require("../apify/md_request_queue");
let SqlRequestQueue = require("../apify/sql_request_queue");
let cheerio = require("cheerio");

if (fs.existsSync("./apify_storage")) {
    fs.rmSync("./apify_storage", { recursive: true });
}


Apify.main(async () => {
    // let bRequestQueue = await Apify.openRequestQueue("TEST");

    // let requestQueue = new MyRequestQueue(bRequestQueue);

    let requestQueue = SqlRequestQueue.createSqliteMemoryQueue();

    await requestQueue.init();

    requestQueue = new Proxy(requestQueue, {
        get(target, name) {
            if (target[name]) {
                return target[name];
            } else {
                console.error("Its hilarious you think I have " + name);
                // throw new Error();
            };
        }
    });

    // let requestQueue = bRequestQueue;
    // Define the starting URL
    let mdRequestQueue = new MDRequestQueue(requestQueue);
    await mdRequestQueue.addRequest({ url: 'http://guangxi.chinatax.gov.cn/restSearch?channelid=290909&searchword=&orderby=RELEVANCE&page=2&pageSize=10' });
    // Function called for each URL
    const handlePageFunction = async ({ request, body }) => {
        let $ = cheerio.load(body);
        console.log("fetch", request.url);
        // Add all links from page to RequestQueue
        let list = $("a").toArray().map(a => new URL($(a).attr("href"), request.loadedUrl).toString());
        let all = [];
        for (let i = 0; i < Math.min(10, list.length); i++) {
            let item = list[i];
            if (item.endsWith(".html")) {
                if (!requestQueue.batchAddRequests) {
                    await requestQueue.addRequest({ url: item });
                } else {
                    all.push({ url: item });
                }
            }
        }
        if (requestQueue.batchAddRequests) {
            await requestQueue.batchAddRequests(all);
        }
    };
    // Create a CheerioCrawler
    const crawler = new AxiosRawCrawler({
        requestQueue: mdRequestQueue,
        handlePageFunction,
        minConcurrency: 10,
        maxRequestRetries: 2
    });
    // Run the crawler
    await crawler.run();
});