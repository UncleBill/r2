var qs = require('querystring');
var url = require('url');
var _ = require('./_');
function entry(req, res, f5creater) {
    // bind all servers to main server
    while(f5creater.creater) {
        f5creater = f5.creater;
    }
    var method = req.method.toUpperCase();
    // debugger
    switch ( method ) {
        case 'POST':
            post(req, res, f5creater);
            break;
        case 'GET':
        default:
            get(req, res, f5creater);
            break;
    }
}

function get(req, res, f5creater) {
    debugger;
    var query = url.parse(req.url).query;
    var action = qs.parse(query).action;
    switch (action) {
        case 'getServers':
            var list = f5creater.servers.list;
            var arr = list.map(function (server) {
                return {
                    dir: server.config.dir,
                    port: server.config.port,
                    status: server.status
                }
            });
            console.log('[api get]', JSON.stringify(arr));
            res.write(JSON.stringify(arr));
            res.end();
            break;
    }
}

function post(req, res, f5creater) {

    var F5R2 = f5creater.constructor;
    var query = url.parse(req.url);
    var action = qs.parse(query).action;

    var body = '';
    req.on('data', function (chunk) {
        body += chunk;
    });
    req.on('end', function () {
        var post = qs.parse(body);
        var json;
        action = action || post.action;
        debugger;
        switch (action) {
            case 'createServer':
                if ( !_.existsdir(post.dir) ) {
                    json = {
                        'success': 0,
                        'message': post.dir + 'is not a validate directory'
                    };
                    res.write(JSON.stringify(json));
                    res.end();
                    return;
                }
                var f5 = new F5R2();
                f5.creater = f5creater;
                var port = post.port || f5creater.servers.lastport + 50;
                var config = {
                    dir: post.dir,
                    port: port
                };
                f5creater.servers.lastport = port;
                f5creater.servers.list.push(f5);
                debugger
                f5.create(config);
                json = {
                    'success': 1,
                    'message': 'new server run at' + port
                }
                res.write(JSON.stringify(json));
                res.end();
                break;

            // close a server
            case 'closeServer':
                console.log('[close server]', post.dir);
                var list = f5creater.servers.list;
                list.forEach(function (server) {
                    if (server.config.dir != post.dir) {
                        return;
                    }
                    if (server.status != 'closed') {
                        res.write(JSON.stringify({
                            'success': 0,
                            'message': 'server is closed'
                        }));
                        res.end();
                        return;
                    }
                    server.close();
                });
                res.write(JSON.stringify({
                    'success': 1,
                    'message': 'close server ' + post.dir
                }));
                res.end();
                break;
        }
    })
    // console.log(req);
}

exports.entry = entry;
