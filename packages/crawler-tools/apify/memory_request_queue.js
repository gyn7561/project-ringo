const { buildSequelize } = require("./sequelize/sequelize");
const md5 = require("md5");

const { Op, col } = require("sequelize");

/**
 * 
 * @param {import("Apify").Request} request 
 * @returns 
 */
function convertRequestToSqlObj(request, orderNo = 0) {
    /**
     * @type {import("./request").Request}
     */

    // const Apify = require("apify");
    // let apifyRequest = new Apify.Request(request);

    let obj = {
        id: request.uniqueKey || md5(request.url),
        method: request.method || "GET",
        noRetry: request.noRetry || false,
        retryCount: request.retryCount,
        orderNo: orderNo,
        url: request.url,
        handledAt: request.handledAt,
        error: request._errorThisTime || false,
        json: {
            loadedUrl: request.loadedUrl,
            payload: request.payload,
            userData: request.userData,
            headers: request.headers,
            errorMessages: (request.errorMessages || [])[0]
        }
    };
    return obj;
}

/**
 * 
 * @param {import("./request").Request} request
 */
function convertToApifyRequest(request) {

    // const Apify = require("apify");

    if (typeof request.json === "string") {
        request.json = JSON.parse(request.json);
    }

    let obj = {
        id: request.id,
        uniqueKey: request.id,
        method: request.method,
        noRetry: !!request.noRetry,
        retryCount: request.retryCount,
        url: request.url,
        loadedUrl: request.json?.loadedUrl,
        errorMessages: [],
        headers: request.json?.headers || {},
        userData: request.json?.userData || {},
        handledAt: request.handledAt,
        payload: request.json?.payload,
        _errorThisTime: false,
        pushErrorMessage: function (err) {
            this.errorMessages = [(err ? err.toString() : "null")];
            this._errorThisTime = true;
        }
    }
    return obj;
}

module.exports = class MemoryRequestQueue {
    constructor() {
    }

    processingSet = new Set();
    requestsMap = new Map();

    async init() {
    }

    async addRequest(request, options = {}) {
        let result = await this.batchAddRequests([request], options);
        return result[0];
    }

    /**
     * 
     * @param {Array<import("Apify").Request>} requests 
     */
    async batchAddRequests(requests, options = {}) {
        let { forefront = false } = options;
        let sqlRequestList = requests.map(r => convertRequestToSqlObj(r, forefront ? -new Date().getTime() : 0));
        let oldSet = new Set();
        for (let i = 0; i < sqlRequestList.length; i++) {
            let sqlRequest = sqlRequestList[i];
            if (!this.requestsMap.has(sqlRequest.id)) {
                this.requestsMap.set(sqlRequest.id, sqlRequest);
            } else {
                oldSet.add(sqlRequest.id);
            }
        }
        return sqlRequestList.map(req => {
            let reqInMemory = this.requestsMap.get(req.id);
            let info = convertToApifyRequest(reqInMemory);
            return {
                requestId: reqInMemory.id,
                wasAlreadyPresent: oldSet.has(req.id),
                wasAlreadyHandled: !!info.handledAt,
                request: info
            }
        })
    }

    async fetchNextRequest() {
        const values = [...this.requestsMap.values()];
        for (let i = 0; i < values.length; i++) {
            const req = values[i];
            if (!req.handledAt && !this.processingSet.has(req.id)) {
                this.processingSet.add(req.id);
                return convertToApifyRequest(req);
            }
        }
        return null;
    }

    async handledCount() {
        const values = [...this.requestsMap.values()];
        return values.filter(v => v.handledAt).length;
    }

    async isEmpty() {
        const values = [...this.requestsMap.values()];
        for (let i = 0; i < values.length; i++) {
            const req = values[i];
            if (!req.handledAt && !this.processingSet.has(req.id)) {
                return false;
            }
        }
        return true;
    }

    async markRequestHandled(request) {
        this.requestsMap.get(request.id).handledAt = new Date();
        this.processingSet.delete(request.id);
        return {
            requestId: request.id,
            wasAlreadyPresent: true,
            wasAlreadyHandled: true,
            request: request
        }
    }

    async isFinished() {
        const values = [...this.requestsMap.values()];
        for (let i = 0; i < values.length; i++) {
            const req = values[i];
            if (!req.handledAt) {
                return false;
            }
        }
        return true;
    }

    async reclaimRequest(request, options = {}) {
        const { forefront = false } = options;
        let obj = convertRequestToSqlObj(request, forefront ? -new Date().getTime() : 0);
        this.requestsMap.set(obj.id, obj);
        return {
            requestId: obj.id,
            wasAlreadyPresent: true,
            wasAlreadyHandled: !!obj.handledAt,
            request: obj
        }
    }
}
