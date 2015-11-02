var qs = require('querystring');
var url = require('url');
var path = require('path');
var _ = require('./_');
var helpers = require('./helpers');
function entry(req, res, f5creater) {
    // bind all servers to main server
    while(f5creater.creater != f5creater) {
        f5creater = f5creater.creater;
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
    var queries = qs.parse(query)
    var action = queries.action;
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
            console.log('[api get]', action, JSON.stringify(arr));
            res.write(JSON.stringify(arr));
            res.end();
            break;
        
        case 'getDirectories':
            var dir = queries['dir'];
            var items = _.lsdir(dir) || [];
            console.log('directory items', items);
            var list = items.filter(function (folder) {
                return _.isdir(path.join(dir, folder));
            }).map(function (folder) {
                return {
                    name: folder,
                    path: path.join(dir, folder)
                }
            });

            res.write(JSON.stringify(list));
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
                    port: port,
                    ignore: _.DFT_IGNORE,
                    watchopts: {
                        ignore: _.DFT_IGNORE
                    }
                };
                debugger
                f5.create(config);

                json = {
                    success: 1,
                    message: 'new server run at' + port,
                    dir: post.dir,
                    port: port
                }
                res.write(JSON.stringify(json));
                res.end();
                break;

            // close a server
            case 'closeServer':
            case 'restartServer':
                console.log('[close server]', post.dir);
                var list = f5creater.servers.list;
                // close server
                list.forEach(function (server) {
                    if (server.config.dir != post.dir) {
                        return;
                    }
                    if (server.status != 'closed') {
                        server.close();
                        res.write(JSON.stringify({
                            success: 0,
                            message: 'close server ' + post.dir,
                            dir: post.dir,
                            port: server.config.port
                        }));
                        res.end();
                    }
                });

                // TODO: unwatch dir
                break;

            case 'pickFiles':
                var rootdir = post.rootdir;
                var files = post['files[]'];
                console.log(post);
                console.log('post rootdir', post.rootdir);
                console.log('post files', post['files[]']);
                if (!files) {
                    res.write({
                        success: 1,
                        message: "No file list post!"
                    });
                }

                // a single file.
                if (typeof files == 'string') {
                    files = [files];
                }
                var processlog = helpers.pickFiles(files, rootdir);
                console.log('processlog', processlog);
                res.write(JSON.stringify(processlog));
                res.end();
                break;
        }
    })
    // console.log(req);
}

exports.entry = entry;
