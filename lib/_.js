var fs = require('fs');
var path = require('path');

function existsSync(file__dir) {
    return fs.existsSync(file__dir);
}

function existsdir(file__dir) {
    if (!existsSync(file__dir)) {
        return false;
    }
    return fs.statSync(file__dir).isDirectory();
}

function isdir(file__dir) {
    return fs.statSync(file__dir).isDirectory();
}

function lsdir(dir) {
    return fs.readdirSync(dir);
}

function slash(filepath) {
    return filepath.replace(/\\/mg, '/');
}

function backslash(filepath) {
    return filepath.replace(/\//mg, '\\');
}

function extname(filepath) {
    return filepath.split('.').pop();
}

function hasOwn(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

var VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'))).version;

var DFT_IGNORE = /(\bnode_modules\b|\.git\b|\.svn\b|\.hg\b)/

exports.existsSync = existsSync;
exports.isdir = isdir;
exports.existsdir = existsdir;
exports.lsdir = lsdir;
exports.slash = slash;
exports.backslash = backslash;
exports.extname = extname;
exports.hasOwn = hasOwn;
exports.VERSION = VERSION;
exports.DFT_IGNORE = DFT_IGNORE;
