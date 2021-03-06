const joinURL = require("url-join");
const { handleResponseCode } = require("../response.js");
const { encodePath, prepareRequestOptions, request } = require("../request.js");

function customRequest(remotePath, requestOptions, options) {
    if (!requestOptions.url) {
        requestOptions.url = joinURL(options.remoteURL, encodePath(remotePath), "/");
    }
    prepareRequestOptions(requestOptions, options);
    return request(requestOptions).then(handleResponseCode);
}

module.exports = {
    customRequest
};
