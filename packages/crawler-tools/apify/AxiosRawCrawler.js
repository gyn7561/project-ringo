
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

        
        let axiosOpts = {
            method: opts.method,
            headers: opts.headers,
            url: opts.url,
            data: opts.body,
            responseType: "arraybuffer",

        };
        if (opts.proxyUrl) {
            let uri = new URL(opts.proxyUrl);

            //   host: string;
            //   port: number;
            //   auth?: {
            //     username: string;
            //     password: string;
            //   };
            //   protocol?: string;
            axiosOpts.proxy = {
                host: uri.hostname,
                port: uri.port,
                protocol: uri.protocol,
                auth: {
                    username: uri.username,
                    password: uri.password,
                }
            }
        }
        let response = await axios.default.request(axiosOpts);

        response.url = response.request.res.responseUrl || response.config.url;
        response.statusCode = response.status;

        return response;
    }
}

module.exports = AxiosRawCrawler;
