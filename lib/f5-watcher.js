var fs = require('fs');
var path = require('path');
var events = require('events');
var _ = require('./_');
var util = require('util');

// TODO:
// - handle folder deleting


// config
// - recursive: Boolean
// - ignore: RegExp
// - deep: Number
function Watcher(config) {
    // 5 ms
    this.frequency = 5;
    config = config || {};
    this.recursive = config.recursive || true;

    // /^$/ match empty string, trick for ignoring nothing
    this.ignore = config.ignore || /^$/;
    // default is unlimited
    this.maxdeep = config.deep || Infinity;
    this._currentDeep = 0;
    this.emitter = new events.EventEmitter();
}

Watcher.prototype = {

    // store all watchers
    watchers: {},

    // Watch directory.
    watch: function (dir) {
        var my = this;
        var watcher;

        // check exists
        if( !_.existsSync(dir) ) {
            return;
        }

        // check deep
        if (this._currentDeep > this.maxdeep) {
            my.emit('maxdeep', {
                deep: this._currentDeep,
                dir: dir
            });
            return;
        }
        // check ignore
        if (my.ignore.test(dir)) {
            my.emit('ignore', dir);
            return;
        }

        var timeout = {};
        watcher = fs.watch(dir, function (eve, filepath) {
            if (! filepath ) {
                return;
            }
            var fullpath = path.join(dir, filepath);
            // check exists
            if (! _.existsSync(fullpath)) {
                return;
            }
            if (my.ignore.test(filepath)) {
                return;
            }

            // don't emit change too close
            if (timeout.fullpath == fullpath) {
                clearTimeout(timeout.timer);
            }

            timeout.fullpath = fullpath;
            timeout.timer = setTimeout(function () {
                my.emit(eve, fullpath);
            }, my.frequency);

        });

        // FIXME: current deep is total of watched folder, not deep of folder
        this._currentDeep ++;
        my.watchers[dir] = watcher;

        if (!my.recursive) {
            return;
        }

        fs.readdir(dir, function (err, files) {
            var parentdir = dir;
            files.map(function (file__dir) {
                if (my.ignore && my.ignore.test(file__dir)) {
                    my.emit('ignore', file__dir);
                    return;
                }

                file__dir = path.join(parentdir, file__dir);
                if (_.existsdir( file__dir )) {
                    my.watch(file__dir);
                }
            })
        })

        return this;
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
                if (_.existsdir( file__dir )) {
                    my.unwatch(file__dir);
                }
            })
        })
    },

    emit: function (eventname, filepath) {
        this.emitter.emit(eventname, filepath);
        return this;
    },

    on: function(eve, callback) {
        var my = this;
        this.emitter.on(eve, function (filepath) {
            if (eve == 'change' && _.existsdir(filepath)) {
                if ( !_.hasOwn(my.watchers, filepath) ) {
                    my.watch(filepath);
                }
                if ( !_.existsSync(filepath) ) {
                    my.unwatch(filepath)
                }
            }
            callback(filepath);
        });
        return my;
    }
}

Watcher.prototype.constructor = Watcher;

module.exports = Watcher;
