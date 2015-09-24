var fs = require('fs');
var path = require('path');
var util = require('util');
var http = require('http');
var url = require('url');
var io = require('socket.io');
var types = require('mime').types;
var Watcher = require('./f5-watcher');
var _ = require('./_');
var helpers = require('./helpers');


// const data
// ==========
var APIRE = /^\/f5api\b/;
var STATICRE = /\/f5static\b/;

function F5R2() {
    this.servers = [];
}

function buildhtml(tree, html) {
    var html = '';
    html += '<ul>'
    for (var i = 0, len = tree.length; i < len; ++i) {
        if (tree[i].type == 'file') {
            html += "<li><a href='"+tree[i].url+"'>" + tree[i].url + "</a></li>";
        } else {
            html += buildhtml(tree[i].children)
        }
    }
    html += '</ul>';
    return html;
}

F5R2.prototype = {
    createServer: function (config) {
        var my = this;
        var dir = config.dir;
        var port = config.port;
        var server = http.createServer(function (req, res) {
            var urlobj = url.parse( req.url );
            var pathname = urlobj.pathname;
            var fspath = dir + decodeURIComponent( pathname );
            var method = req.method.toUpperCase();

            if ( APIRE.test(pathname) ) {
                switch ( method ) {
                    case 'POST':
                        api.post(req, res, {
                            createServer: my.createServer,
                            rootdir: dir
                        });
                    case 'GET':
                        api.get(req, es, {
                            fspath: fspath,
                            rootdir: dir
                        });
                }
            }

            if ( STATICRE.test( req.url ) ) {
                fspath = path.join( __dirname, '..', req.url );
            }

            // TODO respone
            fs.exists(fspath, function (exists) {
                if (!exists) {
                    res.writeHead(404, {
                        'Content-Type': 'text/html'
                    });
                    res.write('404 page');
                } else if (_.isdir(fspath)) {
                    var tree = my.readdir(fspath);
                    res.setHeader('Content-type', 'text/html');
                    res.write('<html>')
                    res.write(buildhtml(tree));
                    res.write('</html>')
                    res.end();
                } else {
                    var ext = path.extname(fspath);
                    ext = ext.slice(1);
                    res.setHeader('Content-Type', types[ext] || 'text/plain');
                    // TODO: use readFileSync ?
                    fs.readFile(fspath, function (err, file) {
                        if (err) {
                            res.writeHead(500, {
                                'Content-Type': 'text/plain'
                            });
                            res.end('500');
                        } else {
                            res.writeHead(200, 'OK');
                            console.log(file);
                            res.write(file);
                            res.end();
                        }
                    })
                }
            })
        });

        return server;
    },


    // readdir or read file content
    browse: function (fsdir, req, res) {
        fs.exists(fsdir, function (exists) {
            if (! exists) {
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });
                res.end('404 page');
            } else if( _.isdir(fsdir) ) {
                fs.readdir(fsdir, function (err, files) {
                    
                })
            }
        })
    },

    // read tree into an object
    readdir: function (fsdir, files, rootdir) {
        var tree = [];
        var fullpath;
        var my = this;
        if (arguments.length < 2) {
            files = fs.readdirSync(fsdir);
        }
        files = helpers.sortFiles(fsdir, files);

        if (fsdir[fsdir.length - 1] != '/') {
            fsdir += '/';
        }

        for (var i = 0, len = files.length; i < len; ++i) {
            if (files[i][0] == '.') {
                continue;
            }
            fullpath = fsdir + files[i];
            debugger;
            if ( _.isdir(fullpath) ) {
                tree.push({
                    name: files[i],
                    type: 'directory',
                    url: _.slash(path.relative( rootdir || '.', fullpath )),
                    children: my.readdir(fullpath, _.lsdir(fullpath), rootdir)
                });
            } else {
                var ext = path.extname(files[i]);
                ext = ext.slice(1);
                filetype = helpers.categroize(ext);
                tree.push({
                    name: files[i],
                    type: 'file',
                    'url': _.slash(path.relative(rootdir || '.', fullpath)),
                    'children': null
                })
            }
        }

        return tree;
    },

    create: function (config) {
        var server = this.createServer(config);
        this.servers.push(server);
        var socket_stack = [];
        sockets = io.listen(server, {
            'log level': 0
        });
        sockets.on('connection', function (socket) {
            socket_stack = socket_stack.filter(function (sk) {
                return !sk['disconnected'];
            })
            socket_stack.push(socket);
            socket.on('close-server', function (data) {
                util.log('server closed!');
            });
            socket.on('close', function (data) {
                util.log('f5 closing');
                process.exit(0);
            })
        });

        var watcher = new Watcher();
        watcher.watch(config.dir);
        watcher.on('change', function (file) {
            var socket;
            file = _.slash(file);
            util.log('[changed]');
            util.log(file);
            // TODO: reload f5file
            var relativefn = path.relative( path.resolve(config.dir), file );
            relativefn = _.slash(relativefn);
            for (var i = 0, len = socket_stack.length; i < len; ++i) {
                socket = socket_stack[i];
                socket.emit('reload', relativefn);
                console.log('[realod]', relativefn);
            }
        })
        server.listen(config.port);
    },

    start: function () {
        var bootdir = __dirname;
        this.create({
            dir: bootdir,
            port: 3333
        });
    }
}

module.exports = F5R2;
