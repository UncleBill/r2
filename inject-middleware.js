var fs = require('fs');
var RELOAD_SCRIPTS = '<script src="/f5r2-static/reloader.js"></script>';


/**
 * 注入刷新代码
 *
 * @param html
 * @returns {String}
 */
function injectReloadScript (html) {
  var placeholder = "__INJECT_SCRIPTS_HERE__";
  var rbodyclose = /(<\/\s*body\s*>(?![^]*<\/\s*body\s*>)|<!--\s*__INJECT_SCRIPTS_HERE__\s*-->)/i;
  return html.replace(rbodyclose, function (_, m) {
    if (m.indexOf(placeholder) > -1) {
      return RELOAD_SCRIPTS;
    }
    return RELOAD_SCRIPTS + m;
  });
}


module.exports = function (req, res, next) {
  let filepath = '.' + decodeURI(req.path)
  fs.readFile(filepath, 'utf-8', function (err, content) {
    if (!err) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');

      let htmlcode = content.toString();
      htmlcode = injectReloadScript(htmlcode);
      res.setHeader('x-f5r2', true);
      res.end(htmlcode);
    } else {
      console.log(`> ${filepath} not found !`);
      next();
    }
  });
}
