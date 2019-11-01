const pathPosix = require("path-posix");
const joinURL = require("url-join");
const { merge } = require("../merge.js");
const { handleResponseCode, processGlobFilter, processResponsePayload } = require("../response.js");
const { normaliseHREF, normalisePath } = require("../url.js");
const { getSingleValue, getValueForKey, parseXML, propsToStat } = require("./dav.js");
const { encodePath, prepareRequestOptions, request } = require("../request.js");

function getDirectoryContents(remotePath, options) {
    // Join the URL and path for the request
    const requestOptions = {
        url: joinURL(options.remoteURL, encodePath(remotePath), "/"),
        method: "PROPFIND",
        headers: {
            Accept: "text/plain",
            Depth: options.hasOwnProperty('deep') ? options.deep : 1
        },
        responseType: "text"
    };
    let response = null;
    let filterSelf = options.hasOwnProperty('filterSelf') ? options.filterSelf : true
    prepareRequestOptions(requestOptions, options);
    return request(requestOptions)
        .then(handleResponseCode)
        .then(res => {
            response = res;
            return res.data;
        })
        .then(parseXML)
        .then(result => getDirectoryFiles(result, options.remotePath, remotePath, options.details, filterSelf))
        .then(files => processResponsePayload(response, files, options.details))
        .then(files => (options.glob ? processGlobFilter(files, options.glob) : files));
}

function getDirectoryFiles(result, serverBasePath, requestPath, isDetailed = false, filterSelf = true) {
    const remoteTargetPath = pathPosix.join(serverBasePath, requestPath, "/");
    const serverBase = pathPosix.join(serverBasePath, "/");
    // Extract the response items (directory contents)
    const multiStatus = getValueForKey("multistatus", result);
    const responseItems = getValueForKey("response", multiStatus);
    return (
        responseItems
            // Filter out the item pointing to the current directory (not needed)
            .filter(item => {
                if (filterSelf) {
                    let href = getSingleValue(getValueForKey("href", item));
                    href = pathPosix.join(normalisePath(normaliseHREF(href)), "/");
                    return href !== serverBase && href !== remoteTargetPath;
                }else {
                    return true
                }
            })
            // Map all items to a consistent output structure (results)
            .map(item => {
                // HREF is the file path (in full)
                let href = getSingleValue(getValueForKey("href", item));
                href = normaliseHREF(href);
                // Each item should contain a stat object
                const propStat = getSingleValue(getValueForKey("propstat", item));
                const props = getSingleValue(getValueForKey("prop", propStat));
                // Process the true full filename (minus the base server path)
                const filename =
                    serverBase === "/" ? normalisePath(href) : normalisePath(pathPosix.relative(serverBase, href));
                return propsToStat(props, filename, isDetailed);
            })
    );
}

module.exports = {
    getDirectoryContents
};
