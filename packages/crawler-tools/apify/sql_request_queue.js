const { buildSqliteSequelize } = require("./sequelize/sequelize");
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

module.exports = class SqlRequestQueue {


    constructor(savePath) {
        this.savePath = savePath;
        if (!savePath) {
            throw new Error("savePath:" + savePath + " error");
        }
    }

    processingSet = new Set()
    async init() {
        this.RequestQueueRequests = await buildSqliteSequelize(this.savePath);
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
        let idList = sqlRequestList.map(d => d.id);
        // let idSet = new Set(idList);
        let currentList = await this.RequestQueueRequests.findAll({
            attributes: ["id", "handledAt"],
            where: {
                id: {
                    [Op.in]: idList
                }
            },
            raw: true
        });
        let oldMap = new Map();
        for (let i = 0; i < currentList.length; i++) {
            let obj = currentList[i];
            oldMap.set(obj.id, obj.handledAt);
        }
        let realList = sqlRequestList.filter(d => !oldMap.has(d.id));
        let createResultList = await this.RequestQueueRequests.bulkCreate(realList, { ignoreDuplicates: true });
        let resultMap = new Map();
        for (let i = 0; i < createResultList.length; i++) {
            let el = createResultList[i];
            resultMap.set(el.id, el);
        }
        return sqlRequestList.map(req => {
            let info = convertToApifyRequest(req);
            if (oldMap.has(req.id)) {
                info.handledAt = oldMap.get(req.id);
            }
            return {
                requestId: req.id,
                wasAlreadyPresent: oldMap.has(req.id),
                wasAlreadyHandled: !!info.handledAt,
                request: info
            }
        })
    }

    async fetchNextRequest() {
        let resultList = await this.RequestQueueRequests.findAll({
            where: {
                id: {
                    [Op.notIn]: [...this.processingSet]
                },
                handledAt: {
                    [Op.eq]: null
                }
            },
            raw: true,
            limit: 1,
            order: col('orderNo')
        });

        if (resultList.length > 0) {
            this.processingSet.add(resultList[0].id);
            return convertToApifyRequest(resultList[0]);
        }
        return null;
    }

    async handledCount() {

        let count = await this.RequestQueueRequests.count({
            attributes: ['id'],
            where: {
                handledAt: {
                    [Op.not]: null
                }
            }
        });
        return count;
    }

    async isEmpty() {
        let resultList = await this.RequestQueueRequests.findAll({
            where: {
                id: {
                    [Op.notIn]: [...this.processingSet]
                },
                handledAt: {
                    [Op.eq]: null
                }
            },
            raw: true,
            limit: 1,
            order: col('orderNo')
        });
        return resultList.length === 0;
    }

    async markRequestHandled(request) {
        request.handledAt = new Date();
        await this.RequestQueueRequests.update({
            handledAt: request.handledAt
        },
            {
                where: {
                    id: request.id
                }
            }
        );

        this.processingSet.delete(request.id);
        return {
            requestId: request.id,
            wasAlreadyPresent: true,
            wasAlreadyHandled: true,
            request: convertToApifyRequest(request)
        }
    }

    async isFinished() {
        let resultList = await this.RequestQueueRequests.findAll({
            attributes: ['id'],
            where: {
                handledAt: {
                    [Op.eq]: null
                }
            },
            limit: 1
        });
        let result = resultList.length === 0;
        return result;
    }

    async reclaimRequest(request, options = {}) {
        const { forefront = false } = options;

        let obj = convertRequestToSqlObj(request, forefront ? -new Date().getTime() : 0);
        await this.RequestQueueRequests.update(obj, {
            where: {
                id: {
                    [Op.eq]: obj.id
                }
            }
        })
        this.processingSet.delete(obj.id);
        return {
            requestId: obj.id,
            wasAlreadyPresent: true,
            wasAlreadyHandled: !!obj.handledAt,
            request: obj
        }
    }

}
