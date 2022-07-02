function startHttpLogServer(port) {
    let ClientRequestInterceptor = require("@mswjs/interceptors/lib/interceptors/ClientRequest").ClientRequestInterceptor;
    let XMLHttpRequestInterceptor = require("@mswjs/interceptors/lib/interceptors/XMLHttpRequest").XMLHttpRequestInterceptor;
    let FetchInterceptor = require("@mswjs/interceptors/lib/interceptors/fetch").FetchInterceptor;
    let BatchInterceptor = require('@mswjs/interceptors/lib/BatchInterceptor').BatchInterceptor;
    let nodeInterceptors = require('@mswjs/interceptors/lib/presets/node').default;

    let ws = require("ws");
    let server = new ws.Server({ port: port });

    let activeWsSet = new Set();
    const interceptor = new BatchInterceptor({
        name: `batch`,
        interceptors: nodeInterceptors,
    });

    let onRequest = (request) => {
        console.log("onRequest");
        activeWsSet.forEach((ws) => {
            ws.send(JSON.stringify(request));
        });
    };
    let onResponse = (request, response) => {
        activeWsSet.forEach((ws) => {
            ws.send(JSON.stringify({ ...response, _requestId: request.id }));
        });
    };

    interceptor.on('request', onRequest);
    interceptor.on('response', onResponse);
    interceptor.on('error', (error) => {
        console.log(id + 'Error:', error)
    });

    let activeCount = 0;
    function regInterceptor(ws) {
        activeWsSet.add(ws);
        activeCount++;
        console.log("连接了一个客户端");
        if (activeCount === 1) {
            interceptor.apply();
        }
        ws.on('close', () => {
            console.log("关闭了一个连接");
            activeCount--;
            activeWsSet.delete(ws);
            if (activeCount === 0) {
                interceptor.dispose();
            }
        });
    }

    server.on("connection", (ws) => {
        regInterceptor(ws);
        ws.on("message", (message) => {
            console.log("收到消息", message);
        });
    });
    console.log(`HTTP LOG SERVER listen on ws://localhost:${port}`)
    console.log(`UI : https://ringo-ui.vercel.app/#/HttpLog/ws%3A%2F%2Flocalhost%3A${port}/1/`)
}

if (process.argv.includes("--ringo-http-log-port")) {
    startHttpLogServer(process.argv[process.argv.indexOf("--ringo-http-log-port") + 1]);
}

module.exports = startHttpLogServer;
