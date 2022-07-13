
let apify = require("apify");
let axios = require("axios");

class AxiosRawCrawler extends apify.CheerioCrawler {
    async _parseResponse(request, responseStream) {
        let response = responseStream;
        let statusCode = response.statusCode;
        let type = response.headers["content-type"] || response.headers["Content-Type"];
        const contentType = { type, encoding: "UTF-8" };
        var buffer = Buffer.from(response.data);
        var responseString = buffer.toString(); // for string
        return { body: responseString, response, contentType };
    }

    async _requestFunction({ request, session, proxyUrl, requestAsBrowserOptions }) {
        let opts = this._getRequestOptions(request, session, proxyUrl, requestAsBrowserOptions);

        //TODO 支持代理
        let response = await axios.default.request({
            method: opts.method,
            headers: opts.headers,
            url: opts.url,
            data: opts.body,
            responseType: "arraybuffer"
        })

        response.url = response.request.res.responseUrl || response.config.url;
        response.statusCode = response.status;

        return response;
    }
}

module.exports = AxiosRawCrawler;
