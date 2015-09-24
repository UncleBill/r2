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
        watcher = fs.watch(dir, function (eve, filename) {
            if (! filename ) {
                return;
            }
            var fullpath = path.join(dir, filename);
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
        my.watchers[dir].close();
        my.watchers[dir] = undefined;
        delete my.watchers[dir];
    },

    emit: function (eventname, filename) {
        emitter.emit(eventname, filename);
    },

    on: function(eve, callback) {
        emitter.on(eve, function (filename) {
            callback(filename);
        });
    }
}

module.exports = Watcher;
