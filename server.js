var http = require("http");

function parseSearchQuery(query) {
	// Prevent undefined query from being used to mess with the server
	if (query === undefined || query === null) {
		return;
	}

	// Split query and add to URL
	var mrEdmondsGenerousHost = "andyedmonds.com";
	var mrEdmondsGenerousPath = "/wp-content/stock/search.php?q=";
	var queryArgument = "";

	if (query.length > 0) {
		var querySubstrings = query.split(" ");
		queryArgument += querySubstrings.shift();

		while (querySubstrings.length > 0) {
			queryArgument += "+" + querySubstrings.shift();
		}
	}

	var options = {
		hostname: mrEdmondsGenerousHost,
		path: mrEdmondsGenerousPath + queryArgument,
		method: "GET",
		port: "80"
	};

	var imageList;
	var req = http.request(options, function(response) {
		imageList = cleanSearchResult(response);
	});
	req.end();

	return imageList;
}

function cleanSearchResult(response) {
	var body = "";
	response.on("data", function(data) {
		body += data;
	});

	response.on("end", function() {
		return showThumbnail(body);
		// console.log(body);
	});
};

// function addImageDOM(img) {
// 	document.body.appendChild(img);
// }

function showThumbnail(response) {
	let responseObj = JSON.parse(response);
	let keys = Object.keys(responseObj);
	let imageList = new Array();
	for (let key of keys) {
		var htmlTag = responseObj[key]['thumbnail_html_tag'];
		imageList.push(htmlTag);
		// addImageDOM(htmlTag);
	}
	console.log(imageList);

	return imageList;

}

// Backup code
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');

http.createServer(function(request, response) {
	var separatedUrl = url.parse(request.url);
	var path = separatedUrl.pathname;
	var rawQueries = separatedUrl.query;
	var queries;

	if (rawQueries !== undefined) {
		queries = querystring.parse(rawQueries)["SearchQuery"];
	}
	

	fs.readFile(path.substring(1), function(err, data) {
		if (err) {
			console.log(err);
			response.writeHead(404, {'Content-Type': 'text/html'})
		} else {
			response.writeHead(200, {'Content-Type': 'text/html'});
			var body = data.toString();
			var finalBody = body.slice(0, body.indexOf("</body>"));

			var imageList = parseSearchQuery(queries);
			if (imageList !== undefined && imageList.length > 0) {
				imageList.forEach(function(currentValue, index, array) {
					finalBody += currentValue;
				});
			}
			
			finalBody += body.slice(body.indexOf("</body>"));
			console.log(finalBody);
			response.write(finalBody);
			
		}
		response.end();
	});
}).listen(8080);
