
module.exports = class MdRequestQueue {

    queue

    constructor(queue) {
        this.queue = queue;
    }

    async addRequest(request, opts) {
        let result = await this.queue.addRequest(request, opts);
        console.log("addRequest", request, opts, result);
        return result;
    }

    async fetchNextRequest() {
        let result = await this.queue.fetchNextRequest();
        console.log("fetchNextRequest", result);
        return result;
    }

    async handledCount() {
        let result = await this.queue.handledCount();
        console.log("handledCount", result);
        return result;
    }

    async isEmpty() {
        let result = await this.queue.isEmpty();
        console.log("isEmpty", result);
        return result;
    }

    async markRequestHandled(request) {
        let result = await this.queue.markRequestHandled(request);
        console.log("markRequestHandled", result, request);
        return result;
    }

    async isFinished() {
        let result = await this.queue.isFinished();
        console.log("isFinished", result);
        return result;
    }

    async reclaimRequest(request, opts) {
        let result = await this.queue.reclaimRequest(request, opts);
        console.log("reclaimRequest", request, opts, result);
        return result;
    }
}
