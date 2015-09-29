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
        if (!fs.existsSync(fspath + file)) {
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

var injectingScripts = '\n<script src="/socket.io/socket.io.js"></script>\n<script src="/f5static/refresh.js"></script>\n'

function injectScript(htmlstr) {
    var rbodyclose = /<\/\s*body\s*>(?![^]*<\/\s*body\s*>)/gi;
    // debugger;
    if (htmlstr.search(rbodyclose) < 0) {
        return htmlstr += injectingScripts;
    } else {
        return RegExp.leftContext + injectingScripts + RegExp.lastMatch + RegExp.rightContext;
    }
}

exports.sortFiles = sortFiles;
exports.categroize = categroize;
exports.injectScript = injectScript;
