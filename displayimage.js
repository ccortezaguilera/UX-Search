var http = require("http");
// Workaround for storing page info.
var webHtmlPage;
const imagesPerPage = 100;
const adobeMode = false;

/**
 * Parses the search query and write the images to the HTML page.
 * 
 * @param {CheerioStatic} $
 * @param {any} fullQuery 
 * @param {http.ServerResponse} response 
 */
function parseSearchQuery($, fullQuery, response) {
    // Split query and add to URL
    let host;
    let fullPath;
    let pathArguments = {};
    if (adobeMode) {
        host = "stock.adobe.io";
        fullPath = "/Rest/Media/1/Search/Files?";
        pathArguments[`search_parameters[words]`]= fullQuery.tagQuery;
    } else {
        host = "andyedmonds.com";
        fullPath = "/wp-content/stock/search.php?";
        pathArguments[`q`] = fullQuery.tagQuery;
        pathArguments[`limit`] = imagesPerPage;
        pathArguments[`offset`] = (fullQuery.pageNumber - 1) * imagesPerPage;
    }
    
    for (let key in pathArguments) {
        fullPath += `${key}=${pathArguments[key]}&`;
    }
    

    // 

    var options = {
        hostname: host,
        // The maximum limit is 100, so we cannot have 200.
        // path: `${adobeStockPath}?q=${queryArgument}&limit=${imagesPerPage}&offset=${(pageNumber - 1) * imagesPerPage}&search_parameters[similar_url]=${fullQuery.urlQuery}`,        
        path: fullPath,
        method: "GET",
        port: "80",
        headers: {
            'X-Product': 'Photoshop/15.2.0',
            'x-api-key': '196dd2bfb89244c694211114553dae9e'
        }
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
        let thumbnailsHtml = $('#imageDiv').append(thumbnailList);
        let thumbnails = thumbnailsHtml.children();

        // Add the javascript to the images
        for (let thumbnailName in thumbnails) {
            if (thumbnails[thumbnailName].hasOwnProperty("attribs") && thumbnails[thumbnailName]["attribs"].hasOwnProperty("src")) {
                thumbnails.get(thumbnailName).attribs['onclick'] = `
                document.getElementById('urlQuery').value = this.getAttribute('src');
                document.getElementById('mainForm').submit();
                `;
            }
        }

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
                    let encodedUrl = encodeURIComponent(formData['URLQuery']);

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

                    var fullQuery = {
                        tagQuery: (encodedQuery !== undefined) ? encodedQuery : "",
                        urlQuery: (encodedUrl !== undefined) ? encodedUrl : "",
                        pageNumber: pageNumber
                    };

                    parseSearchQuery($, fullQuery, response);
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