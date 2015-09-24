var fs = require('fs');

function existsSync(file__dir) {
    return fs.existsSync(file__dir);
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


exports.existsSync = existsSync;
exports.isdir = isdir;
exports.lsdir = lsdir;
exports.slash = slash;
exports.backslash = backslash;
