var F5R2 = require('./lib/f5r2.js');
var f5 = new F5R2();
f5.start(3030);
console.log('start main server at', f5.config.port);
