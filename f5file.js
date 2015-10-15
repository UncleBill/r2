var fs = require('fs');
var path = require('path');
var less = require('less');
// var jade = require('jade');

function compile(fname) {
    if (fs.existsSync(fname)) {
        var ext = path.extname(fname);
        switch (ext) {
            case '.less':
                compileless(fname, ext);
                break;
            case '.jade':
                return;
                compilejade(fname, ext);
        }
    }
}

function compileless(fname, ext) {
    var foundParent = compileParents(fname, ext, compileless);
    // is imported by parent file, `fname` don't need compiling directly
    if (foundParent) {
        console.log('[Found a parent!]');
        return;
    }
    console.log('[LESS filename]', fname);
    var dirname = path.dirname(fname);
    var basename = path.basename(fname, ext);
    var dist = path.join(dirname, basename + ".css");
    var lesscode = fs.readFileSync(fname).toString();
    var _filename = path.join(__dirname, path.relative(__dirname, dirname), basename+ext);
    console.log("_filename", _filename);

    less.render(lesscode, {
        'paths': [__dirname],
        'filename': _filename,
        'compress': false,
        'sourceMap': true,
        'sourceMapFileInline': true,
        'indent': 4
    }, function (e, output) {
        console.log('[LESS] Compiled', fname, '[TO]', dist);
        // console.log(output);
        if (e) {
            console.log(e);
        }
        console.log(fname);
        try {
            // var mapcomment = "\n#<{(|# sourceMappingURL="+dist.split("\\").slice(-1)+".map |)}>#";
            var mapcomment = "";
            var mappings = output.map;
            mappings = mappings.replace(/styles\//g, '');
            // console.log(output);

            // set indent = 4
            output.css = output.css.replace(/^\s\s/mg, '    ');
            fs.writeFileSync(dist, output.css+mapcomment);
            fs.writeFileSync(dist+".map", mappings);
        } catch (e){
            return
        }
    });

}

function compileParents(src, ext, compileFunc) {
    console.log('[In compileParents()]');
    var dirname = path.dirname(src);
    var files = fs.readdirSync(dirname);
    var basename = path.basename(src);
    var foundParent = false;
    files.map(function (file) {
        var filepath = path.resolve(dirname, file);
        var stats = fs.statSync( filepath );
        var extname = path.extname(file);
        if ( !stats.isFile() || extname != ext ) {
            return;
        }
        var content = fs.readFileSync(filepath).toString();
        if ( content.indexOf(basename) > -1 ) {
            // compile parent file
            compileFunc(filepath, ext);
            foundParent = true;
        }
    })
    return foundParent;
}

function compilejade(fname, ext) {
    var dirname = path.dirname(fname);
    var basename = path.basename(fname, ext);
    var dist = path.join(dirname, basename + ".html");
    var jadecode = fs.readFileSync(fname).toString();

    var fn = jade.compile(jadecode,{});
    var html = fn({});
    fs.writeFileSync(dist, html);
}

function compilePtml(fname, ext) {
    var dirname = path.dirname(fname);
    var basename = path.basename(fname, ext);
    var dist = path.join(dirname, basename + ".html");

    var html = phtml.compile(fname);
    console.log(html);
    fs.writeFile(dist, html, function (err) {
        if(err) {
            console.log(err);
        }
    })
    // fs.writeFileSync(dist, html, { 'encoding': 'utf8' })
    return;
}

exports.do = function (filename) {
    return compile(filename)
}
