var http = require("http");
// Workaround for storing page info.
var webHtmlPage;
var pageNumber;
const imagesPerPage = 100;
/**
 * Writes out the HTML webpage, which writes out the form, and then writes out
 * all thumbnails.
 * 
 * @param {http.ServerResponse} response 
 * @param {string} body
 * @param {string} query 
 */
function writeToClientResponse(response, body, query) {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write(body.slice(0, body.indexOf("</body>")));
    parseSearchQuery(query, response);
}

/**
 * Parses the search query and write the images to the HTML page.
 * 
 * @param {CheerioStatic} $
 * @param {string} query 
 * @param {http.ServerResponse} response 
 */
function parseSearchQuery($, query, response) {
    // Prevent undefined query from being used to mess with the server
    if (query === undefined || query === null) {
        response.end();
        return;
    }

    // Split query and add to URL
    var mrEdmondsGenerousHost = "andyedmonds.com";
    var mrEdmondsGenerousPath = "/wp-content/stock/search.php";
    var queryArgument = "";

    queryArgument += query;

    var options = {
        hostname: mrEdmondsGenerousHost,
        // The maximum limit is 100, so we cannot have 200.
        path: `${mrEdmondsGenerousPath}?q=${queryArgument}&limit=${imagesPerPage}&offset=${(pageNumber - 1) * imagesPerPage}`,
        method: "GET",
        port: "80"
    };

    http.get(options, function (mrEdmondResponse) {
        sendRequestToMrEdmond($, mrEdmondResponse, response);
    });
}

/**
 * Sends a request to Mr. Edmonds' website, which should send back a JSON
 * formatted document. Then, write all the thumbnails to the response to the
 * client.
 * 
 * @param {CheerioStatic} $ 
 * @param {http.ServerResponse} mrEdmondResponse 
 * @param {http.ServerResponse} clientResponse 
 */
function sendRequestToMrEdmond($, mrEdmondResponse, clientResponse) {
    var body = "";
    mrEdmondResponse.on("data", function (data) {
        body += data;
    });
    console.log(body);
    mrEdmondResponse.on("end", function () {
        console.log("Entered MrEdmondResponseEnd");
        
        // Write images
        let thumbnailList = getThumbnails(body);
        $('#imageDiv').append(thumbnailList);

        // Write page numbers

        // Check for valid page number inputs.
        let resultsCount = getNumberOfResults(body);
        let pageCount = Math.max(Math.ceil(resultsCount / imagesPerPage), 1);

        // if (pageNumber === undefined || Number(pageNumber) < 1) {
        //     pageNumber = "1";
        // } 
        // else if (pageNumber > pageCount) {
        //     pageNumber = String(pageCount);
        // }

        // Write the page number into the input box.
        var pageNumberBox = $('#pageNumber');
        pageNumberBox.val(pageNumber);
        pageNumberBox.attr('size', Math.floor(Math.log10(pageCount)) + 1);
        pageNumberBox.attr('maxlength', Math.floor(Math.log10(pageCount)) + 2);

        // Write out the max page number
        $('#maxPageNumber').text(`${pageCount}`);

        console.log("Ending prior to use");
        clientResponse.write($.html());
        clientResponse.end();
    });
}

/**
 * Returns an array of thumbnails.
 * 
 * @param {http.ServerResponse} response 
 * @returns
 */
function getThumbnails(response) {
    let responseObj = JSON.parse(response);
    let keys = Object.keys(responseObj);
    let imageList = new Array();
    for (let key of keys) {
        var htmlTag = responseObj[key]['thumbnail_html_tag'];
        if (typeof htmlTag !== "undefined") {
            imageList.push(htmlTag);
        }
    }

    return imageList;
}
/**
 * Returns the number of results on a page.
 * 
 * @param {ServerResponse} response
 * @returns 
 */
function getNumberOfResults(response) {
    let responseObj = JSON.parse(response);
    let imageList = new Array();
    var resultCount = responseObj['nb_results'];
    if (typeof resultCount !== "undefined") {
        return Number(resultCount);
    }

    return 0;
}
// Backup code
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
function display_image() {
    http.createServer(function (request, response) {
        if (request.method === "POST") {
            if (request.url == "/") {
                response.writeHead(200, { 'Content-Type': 'text/html' });
                request.on('data', function (data) {
                    // Obtain the query information.
                    let formData = querystring.parse(data.toString());
                    let encodedQuery = encodeURIComponent(formData['SearchQuery']);
                    pageNumber = encodeURIComponent(formData['PageNumber']);

                    if (pageNumber === undefined) {
                        pageNumber = Math.max(pageNumber, 1);
                    } else if (!Number.isInteger(Number(pageNumber))) {
                        pageNumber = 1;
                    }

                    // Read the HTML file and select key positions in the file.
                    webHtmlPage = fs.readFileSync("index.html").toString();
                    var $ = cheerio.load(webHtmlPage);

                    // Add the orginal query back to the box.
                    if (formData['SearchQuery']) {
                        $('#query').val(formData['SearchQuery']);
                    }

                    console.log(encodedQuery);
                    parseSearchQuery($, encodedQuery, response);
                });
            }
            else {
                fs.readFile("index.html", function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log("We entered here because there was extra and we couldn't open file");
                        response.writeHead(404, { 'Content-Type': 'text/html' });
                        response.end();
                    } else {
                        response.writeHead(200, { 'Content-Type': 'text/html' });
                        response.write(data.toString());
                        response.end();
                    }
                });
            }

        }

    }).listen(8888);
}
module.exports = display_image;