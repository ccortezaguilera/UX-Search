var http = require('http');
var fs = require('fs');
//var express = require('express');
/*Server will handle inital page display and submit button.*/
function displaySearch() {
    http.createServer(function(request, response) {
        if (request.url === "/") {
            fs.readFile("index.html", function(err, data) {
                if (err) {
                    console.log(err);
                    response.writeHead(404, {'Content-Type': 'text/html'});
                    response.end();
                } else {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(data.toString());
                    response.end();
                }
            });
        } 
        else {
            response.writeHead(404);
            response.end("FILE NOT FOUND");
        }
    }).listen(8080);
}
module.exports = displaySearch;