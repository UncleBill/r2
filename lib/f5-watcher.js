var fs = require('fs');
var path = require('path');
var events = require('events');
var _ = require('./_');
var util = require('util');

var emitter = new events.EventEmitter();

function Watcher() {
    // 5 ms
    this.frequency = 5;
}

Watcher.prototype = {

    watchers: {},

    // Watch directory.
    watch: function (dir, recursive) {
        var my = this;
        var watcher;
        if( !_.existsSync(dir) ) {
            return;
        }
        
        var timeout = {};
        watcher = fs.watch(dir, function (eve, filepath) {
            if (! filepath ) {
                return;
            }
            var fullpath = path.join(dir, filepath);
            if (! _.existsSync(fullpath)) {
                return;
            }
            if (timeout.fullpath == fullpath) {
                clearTimeout(timeout.timer);
            }

            timeout.fullpath = fullpath;
            timeout.timer = setTimeout(function () {
                my.emit(eve, fullpath);
            }, my.frequency);

        });
        my.watchers[dir] = watcher;

        if (!recursive) {
            return;
        }

        fs.readdir(dir, function (err, files) {
            var parentdir = dir;
            files.map(function (file__dir) {
                file__dir = path.join(parentdir, file__dir);
                if (_.isdir( file__dir )) {
                    my.watch(file__dir, recursive);
                }
            })
        })

    },

    unwatch: function (dir) {
        var my = this;
        my.watchers[dir] && my.watchers[dir].close();
        my.watchers[dir] = undefined;
        delete my.watchers[dir];
        fs.readdir(dir, function (err, files) {
            var parentdir = dir;
            files.map(function (file__dir) {
                file__dir = path.join(parentdir, file__dir);
                if (_.isdir( file__dir )) {
                    my.unwatch(file__dir);
                }
            })
        })
    },

    emit: function (eventname, filepath) {
        emitter.emit(eventname, filepath);
    },

    on: function(eve, callback) {
        var my = this;
        emitter.on(eve, function (filepath) {
            if (_.isdir(filepath)) {
                if ( !_.hasOwn(my.watchers, filepath) ) {
                    my.watch(filepath);
                }
                if ( !_.existsSync(filepath) ) {
                    my.unwatch(filepath)
                }
            }
            callback(filepath);
        });
    }
}

module.exports = Watcher;
