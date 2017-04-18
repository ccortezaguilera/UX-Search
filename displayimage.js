"use strict";

var https = require("https");
var http = require("http");
var cheerio = require('cheerio');

// Workaround for storing page info.
var jsonResponse = null;
const adobeMode = true;
const imagesPerPage = adobeMode ? 64 : 100;
var tagFrequencies = {};
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
        pathArguments['search_parameters[words]'] = fullQuery.tagQuery;
        pathArguments[`search_parameters[limit]`] = imagesPerPage;
        pathArguments[`search_parameters[offset]`] = (fullQuery.pageNumber - 1) * pathArguments[`search_parameters[limit]`];
        pathArguments[`search_parameters[similar_url]`] = fullQuery.urlQuery;
    } else {
        host = "www.andyedmonds.com";
        fullPath = "/wp-content/stock/search.php?";
        pathArguments[`q`] = fullQuery.tagQuery;
        pathArguments[`limit`] = imagesPerPage;
        pathArguments[`offset`] = (fullQuery.pageNumber - 1) * pathArguments[`limit`];
    }
    
    for (let key in pathArguments) {
        fullPath += `${key}=${pathArguments[key]}&`;
    }

    var options = {
        hostname: host,
        path: fullPath,
        method: "GET",
        headers: {
            'X-Product': 'Photoshop/15.2.0',
            'x-api-key': '196dd2bfb89244c694211114553dae9e'
        }
    };

    if (adobeMode) {
        https.get(options, function (mrEdmondResponse) {
            sendRequestToMrEdmond($, fullQuery, mrEdmondResponse, response);
        });
    } else {
        http.get(options, function (mrEdmondResponse) {
            sendRequestToMrEdmond($, fullQuery, mrEdmondResponse, response);
        });
    }
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
function sendRequestToMrEdmond($, fullQuery, mrEdmondResponse, clientResponse) {
    var body = "";
    mrEdmondResponse.on("data", function (data) {
        body += data;
    });
    
    mrEdmondResponse.on("end", function () {
        // Write images
        jsonResponse = body;
        let obj = getThumbnails(body);
        let thumbnailList = obj["tags"];
        let tagInfo = obj["ids"];
        
        var options = {
            hostname: "www.andyedmonds.com",
            path: "/wp-content/stock/search_id.php?ids=" + tagInfo,
            method: "GET"
        };
        // Fetch tags from API
        http.get(options, function(response) {
            var info = ""
            response.on("data", function(data){
                info += data;
            });
            response.on("end", function(){
                let tags = JSON.parse(info);
                let keys = Object.keys(tags);
                for (let key of keys) {
                    var keywords = tags[key]["keywords"];
                    for (var i = 0; i < keywords.length; i++) {
                        if (tagFrequencies[keywords[i].name] == undefined) {
                            tagFrequencies[keywords[i].name] = 1;
                        } else {
                            tagFrequencies[keywords[i].name] += 1;
                        }
                    }
                }
                var resultTags = "";
                let tagKeys = Object.keys(tagFrequencies).sort(function(a,b){ return tagFrequencies[b] - tagFrequencies[a] });
                var length = tagKeys.length;
                for (let i = 0; i < length; i++){
                    resultTags += encodeURIComponent(tagKeys[i]) + "|" + encodeURIComponent(tagFrequencies[tagKeys[i]]);
                    if (i != length - 1 ) {
                        resultTags += ",";
                    }
                }
                //calculate the deltas
                if (fullQuery.tagInfo.length > 0) {
                    deltaTwoTagList(fullQuery.tagInfo, resultTags);
                }

                // Add the Tags to the hidden form
                let tagValues = $('#tags').val();
                let tagsHtml = $('#tags').val(resultTags);
                let thumbnailsHtml = $('#imageDiv').append(thumbnailList);
                let thumbnails = thumbnailsHtml.children('img');


                // Add the Javascript to the thumbnails
                // thumbnails.removeAttr('width').removeAttr('height');
                thumbnails.addClass('resultImage');
                thumbnails.attr('onclick', `
                document.getElementById('urlQuery').value = this.getAttribute('src');
                document.getElementById('mainForm').submit();
                `);

                // Write page numbers

                // Check for valid page number inputs.
                let resultsCount = getNumberOfResults(body);
                let pageCount = Math.max(Math.ceil(resultsCount / imagesPerPage), 1);

                // Write the page number into the input box.
                var pageNumberBox = $('#pageNumber');
                pageNumberBox.val(fullQuery.pageNumber);
                pageNumberBox.attr('size', Math.floor(Math.log10(pageCount)) + 1);
                pageNumberBox.attr('maxlength', Math.floor(Math.log10(pageCount)) + 2);

                // Write out the max page number
                $('#maxPageNumber').text(`${pageCount}`);
                console.log("Ending prior to use");
                clientResponse.writeHead(200, {'Content-Type': 'text/html' });
                clientResponse.write($.html());
                clientResponse.end();
            });
        });
        
    });
}

/** 
 * @returns  
 */
function deltaTwoTagList(tags1, tags2) {
    //todo calculate tags1 = priorTags and tags2 newtags.
    console.log(tags1 + "\n");
    console.log(tags2);
    var priorTags = tags1.split(",");
    var newTags = tags2.split(",");
    
}


/**
 * Returns an array of thumbnails.
 * 
 * @param {http.ServerResponse} response 
 * @returns
 */
function getThumbnails(response) {
    let responseObj = JSON.parse(response);
    if (adobeMode) {
        responseObj = responseObj['files'];
    }
    let keys = Object.keys(responseObj);
    let imageList = new Array();
    let idList = new Array();
    for (let key of keys) {
        var htmlTag = responseObj[key]['thumbnail_html_tag'];
        var id = responseObj[key]['id'];
        if (typeof htmlTag !== "undefined") {
            imageList.push(htmlTag);
        }
        if (typeof id !== "undefined") {
            idList.push(id);
        }
    }
    var ids = idList.join(",");
    var obj = {
        ids:ids,
        tags:imageList
    };

    return obj;
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
    http.createServer(function (request, response) {
        if (request.method === "GET") {
                //response.writeHead(200, );
                let body = "";
                request.on('data', function (data) {
                    body += data.toString();
                });
                request.on('end', function () {
                    let separatedUrl = url.parse(request.url);
                    let path = separatedUrl.pathname;
                    let rawQueries = separatedUrl.query;

                    // Obtain the query information.
                    let formData = querystring.parse(rawQueries);
                    let encodedQuery = encodeURIComponent(formData['q']);
                    let encodedPageNumber = encodeURIComponent(formData['PageNumber']);
                    let encodedUrl = encodeURIComponent(formData['URLQuery']);
                    let priorTags = "";
                    if (rawQueries != null) {
                        let tagsIndex = rawQueries.indexOf("tags=");
                        if (tagsIndex > 0) {
                            priorTags = decodeURIComponent(rawQueries.substring(tagsIndex+"tags=".length));
                        }
                    }
                    if (encodedPageNumber === undefined) {
                        encodedPageNumber = Math.max(encodedPageNumber, 1);
                    } else if (!Number.isInteger(Number(encodedPageNumber))) {
                        encodedPageNumber = 1;
                    }

                    // Read the HTML file and select key positions in the file.
                    let webHtmlPage = fs.readFileSync("index.html").toString();
                    var $ = cheerio.load(webHtmlPage);

                    // If raw queries is bad, then write as if it were the 8080 port.
                    if (!rawQueries) {
                        $('#pageNumberArea').remove();
                        response.write($.html());
                        response.end();
                        return;
                    }

                    // Add the orginal query back to the box.
                    if (formData['q']) {
                        $('#query').val(formData['q']);
                    }

                    var fullQuery = {
                        tagQuery: (typeof encodedQuery !== "undefined") ? encodedQuery : "",
                        urlQuery: (typeof encodedUrl !== "undefined") ? encodedUrl : "",
                        pageNumber: encodedPageNumber,
                        tagInfo: (typeof priorTags !== "undefined") ? priorTags : ""
                    };

                    parseSearchQuery($, fullQuery, response);
                });
        }else {
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
    }).listen(8888);
}
module.exports = display_image;