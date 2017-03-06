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
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.write(body.slice(0, body.indexOf("</body>")));
    parseSearchQuery(query, response);
}

/**
 * Parses the search query and write the images to the HTML page.
 * 
 * @param {string} query 
 * @param {http.ServerResponse} response 
 */
function parseSearchQuery(query, response) {
    // Prevent undefined query from being used to mess with the server
    if (query === undefined || query === null) {
        response.end();
        return;
    }

    // Split query and add to URL
    var mrEdmondsGenerousHost = "andyedmonds.com";
    var mrEdmondsGenerousPath = "/wp-content/stock/search.php?q=";
    var queryArgument = "";

    queryArgument += query;

    var options = {
        hostname: mrEdmondsGenerousHost,
        // The maximum limit is 100, so we cannot have 200.
        path: mrEdmondsGenerousPath + queryArgument + "&limit=" + imagesPerPage + "&offset=" + ((pageNumber - 1) * imagesPerPage),
        method: "GET",
        port: "80"
    };

    http.get(options, function(mrEdmondResponse) {
        sendRequestToMrEdmond(mrEdmondResponse, response);
    });
}

/**
 * Sends a request to Mr. Edmonds' website, which should send back a JSON
 * formatted document. Then, write all the thumbnails to the response to the
 * client.
 * 
 * @param {http.ServerResponse} mrEdmondResponse 
 * @param {http.ServerResponse} clientResponse 
 */
function sendRequestToMrEdmond(mrEdmondResponse, clientResponse) {
    var body = "";
    mrEdmondResponse.on("data", function(data) {
        body += data;
    });
    console.log(body);
    mrEdmondResponse.on("end", function() {
        console.log("Entered MrEdmondResponseEnd");
        // Write images
        let thumbnailList = getThumbnails(body);
        //TODO will fix the response to write the file and place value with search query
        //clientResponse.write("<html><body>"); 
        for (var thumbnail of thumbnailList) {
            clientResponse.write(thumbnail);
        }
        clientResponse.write("\n</div>");

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

        // Locate the HTML page display markup.
        let positionOfImageEnd = webHtmlPage.indexOf("<label for=\"PageNumber\"");
        let positionOfPageInput = webHtmlPage.indexOf(" id=\"pageNumber\">", positionOfImageEnd);
        let positionOfDivEnd = webHtmlPage.indexOf("</div>", positionOfPageInput);

        // Write HTML up to the point where the page number is shown.
        // clientResponse.write(webHtmlPage.substring(positionOfImageEnd, positionOfPageInput));
        clientResponse.write("<label for=\"PageNumber\">Page</label>");

        // Write the page number into the input box.
        clientResponse.write("<input type=\"text\" name=\"PageNumber\" id=\"pageNumber\" ");
        clientResponse.write("value=\"" + String(pageNumber) + "\"");
        clientResponse.write("size=\"" + (Math.log10(pageCount) + 1) + "\">");

        // Write out the rest of the HTML.
        // clientResponse.write(webHtmlPage.substring(positionOfPageInput, positionOfDivEnd + "</div>".length));
        clientResponse.write("<input type=\"submit\" name=\"Submit\" value=\"Go!\"></form>");
        clientResponse.write(webHtmlPage.substring(positionOfDivEnd + "</div>".length));
        console.log("Ending prior to use");
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
function display_image() {
    http.createServer(function(request, response) {
        if (request.method === "POST") {
            if (request.url == "/") {
                response.writeHead(200, {'Content-Type': 'text/html'});
                request.on('data', function(data) {
                    // Obtain the query information.
                    let formData = querystring.parse(data.toString());
                    let encodedQuery = encodeURIComponent(formData['SearchQuery']);
                    pageNumber = encodeURIComponent(formData['PageNumber']);

                    if (pageNumber === undefined || Number(pageNumber) < 1) {
                        pageNumber = "1";
                    } 

                    // Read the HTML file and select key positions in the file.
                    webHtmlPage = fs.readFileSync("index.html").toString();
                    let positionOfTextBoxInput = webHtmlPage.indexOf("id=\"query\"");
                    let positionOfBodyEnd = webHtmlPage.indexOf("<div align=\"left\" id=\"imageDiv\">", positionOfTextBoxInput) + "<div align=\"left\" id=\"imageDiv\">".length;

                    // Write the search box and the orginal query in the box.
                    response.write(webHtmlPage.substring(0, positionOfTextBoxInput));
                    response.write("value=\"" + formData['SearchQuery'] + "\" ");
                    response.write(webHtmlPage.substring(positionOfTextBoxInput, positionOfBodyEnd));

                    console.log(encodedQuery);
                    parseSearchQuery(encodedQuery, response);
                });
                
            /*
            fs.readFile(path.substring(1), function(err, data) {
                if (err) {
                    console.log(err);
                    console.log("couldn't process request!")
                    response.writeHead(404, {'Content-Type': 'text/html'});
                    response.end();
                } else {
                    writeToClientResponse(response, data.toString(), queries);
                }
            });*/
        }
        else {
            fs.readFile("index.html", function(err, data) {
                if (err) {
                    console.log(err);
                    console.log("We entered here because there was extra and we couldn't open file");
                    response.writeHead(404, {'Content-Type': 'text/html'});
                    response.end();
                } else {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(data.toString());
                    response.end();
                }
            });
        }

        }
        
    }).listen(8888);
}
module.exports = display_image;