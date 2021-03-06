var fs = require('fs');
var path = require('path');
var os = require('os');

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
    try {
        return fs.statSync(file__dir).isDirectory();
    } catch(err) {
        return false;
    }
}

function lsdir(dir) {
    if (!existsSync(dir)) {
        return false;
    }
    return fs.readdirSync(dir);
}

function slash(filepath) {
    return filepath.replace(/\\/mg, '/');
}

function backslash(filepath) {
    return filepath.replace(/\//mg, '\\');
}

function extname(filepath) {
    return path.basename(filepath).split('.').pop();
}

function hasOwn(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

var VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'))).version;

var DFT_IGNORE = /(\bnode_modules\b|\bf5picker\b|\.git\b|\.svn\b|\.hg\b)/;

function cpfile(src, tgt, cb) {
    var src = path.normalize(src);
    ensureExists( path.dirname(tgt) );

    readst = fs.createReadStream( src );
    writest = fs.createWriteStream( tgt );

    readst.pipe( writest );
    cb && cb(src, tgt);
}

function ensureExists(dir) {
    var parentdir = path.join.apply(null, dir.split(path.sep).slice(0, -1));
    if (!existsSync(dir)) {
        ensureExists(parentdir);
        fs.mkdirSync(dir);
    }
}

// https://gist.github.com/szalishchuk/9054346
function getLocalIp() {
    var address,
        ifaces = os.networkInterfaces();

    for (var dev in ifaces) {
        var iface = ifaces[dev].filter(function(details) {
            return details.family === 'IPv4' && details.internal === false;
        });

        if(iface.length > 0) address = iface[0].address;
    }

    return address;
}

// http://stackoverflow.com/a/19524949
function getUserIP(req) {
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    return ip;
}

function getHistoryFile() {
    var profile = process.env.USERPROFILE;
    var filename = 'history.json';
    var historyFile = path.join(profile, 'f5r2', filename);
    return historyFile;
}

var historyFile = getHistoryFile();
function readHistory() {
    if (!existsSync(historyFile)) {
        return [];
    }
    var str = fs.readFileSync(historyFile).toString() || "[]";
    var history = JSON.parse(str);
    console.log('Read history:', historyFile, history);
    return history;
}

function writeHistory(list) {
    fs.writeFile(historyFile, JSON.stringify(list), function (err) {
        if (err) {
            console.log(err);
        }

        console.log('Save history:', historyFile, list);
    });
}

function disks() {
    // *nix
    if (process.platform.indexOf('win') < 0) {
        return ['/'];
    }
    var charA = 65;
    var charZ = 90; // or 65+25
    var d, code;
    var list = [];
    for (var code = charA; code < charZ; ++code) {
        d = String.fromCharCode(code) + ":\\";
        if (existsSync(d)) {
            list.push(d)
        }
    }
    return list;
}

exports.existsSync = existsSync;
exports.isdir = isdir;
exports.existsdir = existsdir;
exports.ensureExists = ensureExists;
exports.lsdir = lsdir;
exports.slash = slash;
exports.backslash = backslash;
exports.extname = extname;
exports.hasOwn = hasOwn;
exports.VERSION = VERSION;
exports.DFT_IGNORE = DFT_IGNORE;
exports.cpfile = cpfile;
exports.hostIP = getLocalIp();
exports.getClientIP = getUserIP;
exports.getHistoryFile = getHistoryFile;
exports.readHistory = readHistory;
exports.writeHistory = writeHistory;
exports.disks = disks()