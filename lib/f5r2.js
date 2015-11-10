var fs = require('fs');
var path = require('path');
var util = require('util');
var http = require('http');
var url = require('url');
var io = require('socket.io');
var types = require('mime').types;
var ejs = require('ejs');
var Watcher = require('./f5-watcher');
var _ = require('./_');
var helpers = require('./helpers');
var api = require('./api');


// const data
// ==========
var APIRE = /^\/f5api\b/;
var STATICRE = /\/f5static\b/;
var LOCAL_IP = _.getLocalIp();

function F5R2() {
    this.servers = {
        lastport: -1,
        list: _.readHistory()
    };
    this.creater = this;
}

F5R2.prototype = {
    createServer: function (config) {
        var my = this;
        config.ignore = config.ignore || _.DFT_IGNORE;
        my.config = config;
        var server = http.createServer(function (req, res) {
            var userip = req.connection.removeAddress;
            var urlobj = url.parse( req.url );
            var pathname = urlobj.pathname;
            var fspath = config.dir + decodeURIComponent( pathname );

            if ( APIRE.test(pathname) ) {
                api.entry(req, res, my);
                return;
            }

            // redirect static resource
            if ( STATICRE.test( req.url ) ) {
                fspath = path.join( __dirname, '..', req.url );
            }

            fs.exists(fspath, function (exists) {
                if (!exists) {
                    res.writeHead(404, {
                        'Content-Type': 'text/html'
                    });
                    res.write(helpers.render('404.ejs', {
                        title: '404 Not Found',
                        path: fspath
                    }));
                    res.end();
                } else if (_.isdir(fspath)) {
                    var tree = my.readdir(fspath);
                    res.setHeader('Content-type', 'text/html');
                    // TODO: render tree on frontend
                    var treehtml = helpers.render('tree.ejs', {
                        'title': fspath,
                        'tree': tree,
                        'rootpath': path.resolve(my.config.dir),
                        'pwd': path.resolve(fspath),
                        'version': _.VERSION,
                        'ismain': my.creater == my,
                        'mainport': my.creater.config.port,
                        'localip': LOCAL_IP
                    })
                    res.write(treehtml)
                    res.end();
                } else {
                    var ext = _.extname(fspath);
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
                            file = my.processfile(file, fspath);
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
    readdir: function (fsdir, files) {
        var tree = [];
        var fullpath;
        var my = this;
        if (arguments.length < 2) {
            files = fs.readdirSync(fsdir);
        }
        files = helpers.sortFiles(fsdir, files);

        for (var i = 0, len = files.length; i < len; ++i) {

            if (my.config.ignore.test(files[i])) {
                continue;
            }
            fullpath = path.join(fsdir, files[i]);
            // debugger;
            if ( _.existsdir(fullpath) ) {
                tree.push({
                    name: files[i],
                    type: 'directory',
                    url: _.slash(path.relative(my.config.dir, fullpath)),
                    children: my.readdir(fullpath, _.lsdir(fullpath))
                });
            } else {
                var ext = _.extname(files[i]);
                filetype = helpers.categroize(ext);
                tree.push({
                    name: files[i],
                    type: 'file',
                    mime: types[ext],
                    url: _.slash(path.relative(my.config.dir, fullpath)),
                    children: null
                })
            }
        }

        return tree;
    },

    create: function (config) {
        var my = this;
        var server = this.createServer(config);
        var mainserver = this;

        my.runner = helpers.initrun(config.dir);
        this.server = server;
        var socket_stack = [];
        sockets = io.listen(server, {
            'log level': 0
        }).sockets;
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
            });

        });

        this.watcher = new Watcher(config.watchopts);
        this.watcher.watch(config.dir);
        this.watcher.on('change', function (file) {
            var socket;
            var basename = path.basename(file);
            if (basename == 'f5file.js') {
                var f5filepath = path.resolve(config.dir, basename);
                delete require.cache[require.resolve(f5filepath)];
                // EBUSY Error
                my.runner = require(f5filepath);
            }

            my.runner.do(file);
            file = _.slash(file);
            util.log('[changed]');
            util.log(file);
            // TODO: reload f5file
            // debugger
            var relativefn = path.relative( path.resolve(config.dir), file );
            relativefn = _.slash(relativefn);
            socket_stack.forEach(function (socket) {
                socket.emit('reload', relativefn);
                util.log('[realod]' + relativefn);
            });
        })
        server.listen(config.port);
        this.status = 'running';

        debugger
        while(mainserver.creater != mainserver) {
            mainserver = mainserver.creater;
        }
        mainserver.servers.lastport = parseInt(config.port);
        var has = false;
        mainserver.servers.list = mainserver.servers.list.map(function (server) {
            if (server.config.dir == config.dir && server.config.port == config.port) {
                has = true;
                return my;
            }
            return server;
        });
        if (!has) {
            mainserver.servers.list.push({
                status: my.status,
                config: config
            })
        }
        // TODO: servers changed, emit message to frontend
        _.writeHistory(mainserver.servers.list.map(function (server) {
            return {
                config: {
                    dir: server.config.dir,
                    port: server.config.port
                }
            }
        }));
    },

    processfile: function (filebuf, fspath) {
        var extname = _.extname(fspath);
        var bufstr = filebuf.toString();
        if (extname == 'html' || extname == 'htm') {
            return helpers.injectScript(bufstr);
        }
        if (extname == 'css') {
            bufstr += "\n/*# sourceMappingURL=" + fspath.split(/[\/\\]/).slice(-1) + ".map */";
            return bufstr;
        }
        return filebuf;
    },

    // start main server
    start: function (port) {
        var bootdir = path.join( __dirname, '..', 'frontend' );
        var port = port || 3000;
        // console.log('bootdir', bootdir);
        this.create({
            dir: bootdir,
            port: port,
            ignore: _.DFT_IGNORE,
            watchopts: {
                ignore: _.DFT_IGNORE
            }
        });
    },

    // close a server
    close: function () {
        this.watcher.unwatch(this.config.dir);
        if (this.status != 'closed') {
            this.server.close();
            this.status = 'closed';
        }
    }
}
F5R2.prototype.constructor = F5R2;

module.exports = F5R2;
