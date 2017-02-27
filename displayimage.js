var http = require("http");

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
		path: mrEdmondsGenerousPath + queryArgument + "&limit=100",
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
		let thumbnailList = getThumbnails(body);
        //TODO will fix the response to write the file and place value with search query
        //clientResponse.write("<html><body>"); 
		for (var thumbnail of thumbnailList) {
			clientResponse.write(thumbnail);
		}
		clientResponse.write("</body></html>");
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

// Backup code
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');
function display_image() {
    http.createServer(function(request, response) {
        if (request.method === "POST") {
            if (request.url == "/") {
                response.writeHead(200, {'Content-Type': 'text/html'});

				// Read html for the searchbox and write that before displaying images.
				fs.readFile("index.html", function(err, data) {
					if (err) {
						console.log(err);
						response.end();
					} else {
						let htmlPage = data.toString();
						response.write(htmlPage.substring(0, htmlPage.indexOf("</body>")));
						//response.end();
						
						request.on('data', function(data) {
							let formData = querystring.parse(data.toString());
							let encodedQuery = encodeURIComponent(formData['SearchQuery']);
							console.log(encodedQuery);
							parseSearchQuery(encodedQuery, response);
						
						});
					}
				});
				// CLOSE_CHANGES
                
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
        
    }).listen(8080);
}
module.exports = display_image;