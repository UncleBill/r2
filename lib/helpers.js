var path = require('path');
var ejs = require('ejs');
var fs = require('fs');
var _ = require('./_');

// http://stackoverflow.com/questions/4340227/sort-mixed-alpha-numeric-array
function sortAlphaNum(a, b) {
    var reAlpha = /[^a-zA-z]/g;
    var reNumber = /[^0-9]/g;
    var aAlpha = a.replace(reAlpha, '');
    var bAlpha = b.replace(reAlpha, '');

    if (aAlpha == bAlpha) {
        var aNumber = parseInt( a.replace(reNumber, ''), 10 );
        var bNumber = parseInt( b.replace(reNumber, ''), 10 );
        return aNumber === bNumber ? 0 : aNumber > bNumber ? 1 : -1;
    } else {
        return aAlpha > bAlpha ? 1 : -1;
    }
}

function sortFiles(fspath, files) {
    var folderArr = [],
        fileArr = [];
    files = files.sort(sortAlphaNum);
    if (fspath[fspath.length -  1] != '/') {
        fspath += '/';
    }
    files.map(function (file) {
        if (!_.existsSync(fspath + file)) {
            return;
        }
        if ( _.isdir(fspath+file) ) {
            folderArr.push(file);
        } else {
            fileArr.push(file);
        }
    });

    return folderArr.concat(fileArr);
}

function categroize(ext) {
    var filetype = '';
    switch (ext) {
        case 'css':
            filetype = 'css';
        case 'html':
        case 'htm':
            filetype = 'html';
        case 'js':
        case 'coffee':
        case 'ts':
            filetype = 'javascript';
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'png':
            filetype = 'image';
        case 'rar':
        case 'zip':
        case '7z':
            filetype = 'zipfile';
        default:
            filetype = 'defaulttype';
    }

    return filetype;
}

var injectingScripts = '\n<script src="/socket.io/socket.io.js"></script>\n<script src="/f5static/refresh.js"></script>\n<script src="/f5static/log.js"></script>'

function injectScript(htmlstr) {
    var holder = "__F5_SCRIPTS_HOLDER__";
    var rbodyclose = /(<\/\s*body\s*>(?![^]*<\/\s*body\s*>)|<!--\s*__F5_SCRIPTS_HOLDER__\s*-->)/i;
    return htmlstr.replace(rbodyclose, function (_, m) {
        if (m.indexOf(holder) > -1) {
            return injectingScripts;
        }
        return injectingScripts + m;
    });
}


// renderer
function render(file, data) {
    var tplfile = path.join(__dirname, '..', 'template', file);
    var tplstr = fs.readFileSync(tplfile).toString()
    var result = ejs.render(tplstr, data, {
        filename: tplfile
    });
    return result;
}

// initialize runner with directory
function initrun(dir) {
    var runner;
    var f5filepath = path.join( path.resolve(dir), 'f5file.js' );
    console.log('[init runner]');
    if ( _.existsSync(f5filepath) ) {
        console.log('Found', f5filepath);
        try {
            runner = require(f5filepath);
        } catch (reqerr) {
            console.log( '[require error message]', reqerr.message );
        }
    } else {
        console.log(f5filepath, "doesn't exist!");
        runner = {
            do: function () {
                
            }
        }
    }

    return runner;
}


// pick selected files into `f5picker` folder
function pickFiles(files, rootdir) {
    var processlog = [];
    files.map(function (file) {
        var src = path.join(rootdir, file);
        var tgt = path.join(rootdir, 'f5picker', file);
        _.cpfile(src, tgt, function (src, tgt) {
            processlog.push({
                from: src,
                to: tgt
            });
        });
    })
    return processlog;
}

exports.sortFiles = sortFiles;
exports.categroize = categroize;
exports.injectScript = injectScript;
exports.render = render;
exports.initrun = initrun;
exports.pickFiles = pickFiles;
