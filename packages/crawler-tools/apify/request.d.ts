export interface Request {
    id: string,
    orderNo: number,
    url: string,
    method: string,
    retryCount: number,
    noRetry: false,
    json: Object,
    handledAt?: Date
}