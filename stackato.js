var fs = require('fs');
var http = require('http');

var mimes = {
    'css': 'text/css',
    'jpg': 'image/jpeg',
    'js': 'application/javascript',
    'png': 'image/png',
    'svg': 'image/svg+xml',
    'webapp': 'application/x-web-app-manifest+json',
    'woff': 'application/font-woff'
};

// Here's the local server.
http.createServer(function(request, response) {

    var now = new Date();

    console.log(
        '[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '] ' +
        request.url);

    function writeIndex() {
        fs.readFile('./src/index.html', function(error, content) {
            // We'll assume that you don't delete index.html.
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end(content, 'utf-8');
        });
    }

    if (request.url == '/') {
        return writeIndex();
    }

    var qindex;
    if ((qindex = request.url.indexOf('?')) !== -1) {
        request.url = request.url.substr(0, qindex);
    }

    var filePath = './src' + request.url;
    fs.exists(filePath, function(exists) {
        if (exists && !fs.statSync(filePath).isDirectory()) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                    console.error(error);
                } else {
                    var dot = request.url.lastIndexOf('.');
                    if (dot > -1) {
                        var extension = request.url.substr(dot + 1);
                        response.writeHead(200, {'Content-Type': mimes[extension]});
                    }

                    response.end(content, 'utf-8');
                }
            });
        } else {
            writeIndex();
        }
    });

}).listen(process.env.VCAP_APP_PORT || 8675,
          process.env.VCAP_APP_HOST || '127.0.0.1');
