var log = function () {
    // Do nothing.
};
(function () {
    if (socket == undefined) {
        return;
    }

    socket.on('log', function (data) {
        console.log(data);
    })

    socket.on('log:json', function (json) {
        console.log(JSON.parse(json));
    })

    socket.on('log:html', function (htmlstr) {
        var $ele = $(htmlstr);
        console.log($ele[0]);
        // release memory
        $ele = null;
    })

    log = function log() {
        var args = [].slice.call(arguments,0);
        args = args.map(function (a) {
            return "| " + a;
        })
        var max = 0;
        for (var i = 0; i < args.length; ++i) {
            if (args[i].length > max) {
                max = args[i].length;
            }
        }
        max = Math.max(60, Math.min(max, 80));
        var dashline = new Array(max).join('-');
        args.unshift(",---[log]" + dashline + "\n");
        var e = new Error();
        // args = args.concat(callstacks(e.stack));
        args.push("`--------" + dashline);
        args.map(function (arg) {
            socket.emit('log', arg);
        })
        e.stacks = callstacks(e.stack);
        log.json(e);
    }

    log.json = function (obj) {
        if (typeof obj == 'object') {
            obj = JSON.stringify(obj);
        }
        socket.emit('log:json', obj);
    }

    log.html = function (html) {
        if (typeof html == 'object' && 'tagName' in html) {
            html = html.outerHTML;
        }
        socket.emit('log:html', html);
    }

    var touchtimer;
    document.addEventListener('touchstart', function (e) {
        clearTimeout(touchtimer);
        touchtimer = setTimeout(function() {
            log('emit html');
            log.html(e.target);
        }, 500);
    })
    document.addEventListener('touchend', function () {
        clearTimeout(touchtimer)
    })


    function callstacks(stack) {
        var end, stacks = stack.split('\n');
        stacks.shift();
        return stacks.map(function (st) {
            return st;//.substring(0, st.indexOf('?'));
        })

    }

})();
