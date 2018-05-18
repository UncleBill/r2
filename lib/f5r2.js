var path = require('path')
var express = require('express')
var serveIndex = require('serve-index')
var chokidar = require('chokidar')
var inject = require('../inject-middleware.js')

var app = express()

app.use('/f5r2-static', express.static(path.resolve(__dirname, '../static')))

// 注入刷新代码
app.get('*.html?', inject)

var clients = {}
var clientId = 0;
// 用 EventSource 跟前端通信，实现自动刷新
app.get('/f5r2-stream', (req, res, next) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream;charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n')
  setInterval(() => {
    res.write('data: <3\n\n')
  }, 5000)
  let id = clientId ++;
  clients[id] = res
  res.on('close', () => {
    clients[id] = undefined
    delete clients[id]
  })
})

// 静态文件浏览
app.use(serveIndex('.', {
  icons: true,
  filter: function (fn, index, files, dir) {
    var ignores = ['node_modules'];
    return ignores.indexOf(fn) === -1;
  },
  views: 'details'
}))
app.use('/', express.static('.'))

let configIgnored = [];
let configFile = path.join(process.cwd(), 'f5r2.js');
try {
  if (fs.existsSync(configFile)) {
    configIgnored = require(configFile).ignored
  }
} catch (e) { }

let count = 0;
chokidar.watch('.', {
  ignored: [/((^|[\/\\])\..|(^|[\/\\])node_modules[\/\\])/].concat(configIgnored)
}).on('change', (filepath) => {
  var fp = filepath.replace(/\\/g, '/');
  console.log('> changed', fp);
  // .nextTick 尝试解决响应结果为空白页面的问题
  process.nextTick(() => {
    Object.keys(clients).forEach(id => {
      // 用 EventSource 通知页面更新
      clients[id].write(`data: ${JSON.stringify({
        event: 'reload',
        file: fp
      })}\n\n`)
    })
  })
}).on('add', function () {
  count++;
}).on('ready', function () {
  console.log('> Watching', count, 'files.');
})

module.exports = app
