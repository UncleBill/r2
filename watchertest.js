var Watcher = require('./lib/f5-watcher');

var watcher = new Watcher({
    'ignore': /(\bnode_modules\b|\.git\b)/,
    'deep': 2
})
watcher.watch('.');
watcher.on('change', function (file) {
    console.log('event: change', file);
}).on('ignore', function (dir) {
    console.log('ignore', dir);
}).on('maxdeep', function (deep) {
    console.log('event: maxdeep', deep);
})
