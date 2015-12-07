var linkpre = location.protocol + '//' + location.hostname + ":";
var $btnReload = $("#btnReload");
var $btnCreate = $("#btnCreate");
var $projectList = $("#projectList");

// load projects
// =============
function loadProjects() {
    var url = '/f5api';
    var tpl = $("#projectTpl").html();
    $.ajax({
        'url': url,
        'dataType': 'json',
        'data': {
            'action': 'getServers'
        }
    }).done(function (list) {
        var htmlcode = [];
        var proj, obj;
        for (var i = 0, len = list.length; i < len; ++i) {
            obj = list[i];
            proj = tpl.replace(/{{(.*?)}}/gm, function (_, m) {
                if (m == 'projectLink') {
                    return linkpre + obj['port'];
                }
                switch (m) {
                    case 'projectPath':
                        return obj['dir'];
                    case 'projectPort':
                        return obj['port'];
                    case 'projectLink':
                        return linkpre + obj['port'];
                    case 'projectName':
                        return obj['dir'].split(/(\\|\/)/).pop();
                }
                return obj[m];
            });
            htmlcode.push(proj);
        }
        $projectList.html( htmlcode.join('') );
    });

}

loadProjects();


// template render function
// ========================
function render(tpl, data, func) {
    func = func || function (_, m) {
        return data[m];
    }
    return tpl.replace(/{{(.*?)}}/gm, func);
}

// project list
// ============

// reload
$btnReload.click(loadProjects);

// create
$btnCreate.click(function () {
    var $newpath = $("#newpath");
    var $newport = $("#newport");
    var path = $newpath.val();
    var port = $newport.val();
    $newpath.attr('readOnly', true);
    createServer({
        dir: path,
        port: port
    }, function () {
        $newpath.attr('readOnly', false);
        $newpath.val('');
    });
});


function createServer(config, callback) {
    var apiurl = '/f5api?action=createServer';
    $.post(apiurl, {
        'dir': config.dir,
        'port': config.port,
        'action': 'createServer'
    }, function (resp) {
        // loadProjects();
        callback && callback(resp);
        var obj = JSON.parse(resp);
        if (obj.success == 1) {
            loadProjects();
        }
    })
}

// view
$projectList.on('click', '.project', function () {
    var $this = $(this);
    $this.addClass('selected').siblings().removeClass('selected');
})

$projectList.on('click', '.operate-restart', function (eve) {
    var $project = $(this).parents('.project');
    var dir = $project.attr('data-dir');
    var port = $project.attr('data-port');
    createServer({
        dir: dir,
        port: port
    }, function (resp) {
        var obj = JSON.parse(resp);
        var port = obj.port;
        var url = location.protocol + "//" + location.hostname + ":" + port;
        setMainFrame(url);
    })
})

$projectList.on('click', '.project-name', function (eve) {
    var $project = $(this).parents('.project');
    var dir, port;
    if (!$project.hasClass('status-running')) {
        eve.preventDefault();
        eve.stopPropagation();
        dir = $project.attr('data-dir');
        port = $project.attr('data-port');
        createServer({
            dir: dir,
            port: port
        }, function (resp) {
            var obj = JSON.parse(resp);
            var port = obj.port;
            var url = location.protocol + "//" + location.hostname + ":" + port;
            setMainFrame(url);
        });
    }
});

// close server
$projectList.on('click', '.operate-close', function (eve) {
    eve.stopPropagation();
    var $this = $(this);
    var $project = $this.parents('.project');
    var dir = $project.attr('data-dir');
    var apiurl = '/f5api?action=closeServer';
    $.post(apiurl, {
        'dir': dir,
        'action': 'closeServer'
    }, function (resp) {
        var obj = JSON.parse(resp);
        if (obj.success == 1) {
            loadProjects();
        }
    });
})




function setMainFrame(url) {
    $("#mainFrame").attr('src', url);
}


// input directory
var $directories = $("#directories");
var $newpath = $("#newpath");
$newpath.on('keyup paste click', function (eve) {
    eve.stopPropagation()
    loadDirectories();
});
$directories.on('click', 'li', function (eve) {
    eve.stopPropagation();
    var dir = $(this).attr('data-path');
    loadDirectories(dir);
    $newpath.val(dir);
    
});
$(document).click(function () {
    $directories.addClass('hide');
});
function loadDirectories(dir) {
    dir = dir || $newpath.val().trim();
    $.ajax({
        url: '/f5api',
        dataType: 'json',
        data: {
            action: 'getDirectories',
        dir: dir
        }
    }).done(function (list) {
        var html = ['<ul>'];
        html = html.concat( list.map(function (folder) {
            var p = folder.path || folder;
            return "<li data-path='" + p + "'>"  + p + "</li>";
        }) )
        html.push('</ul>');
        $directories.html( html.join('\n') ).removeClass('hide');
    })
}


function closeF5R2() {
    socket.emit('close');
}


// clear history
// =============
$("#operateClearHistory").click(function () {
    var yes = confirm('Clear All history?');
    if (!yes) {
        return;
    }
    var apiurl = '/f5api';
    $.post(apiurl, {
        action: 'clearHistory'
    }, function (resp) {
        var obj = JSON.parse(resp);
        if (obj.success) {
            loadProjects();
        }
    })
});


// read version
// ============
readVersion();
function readVersion() {
    var url = '/f5api';
    var $version = $(".version");
    $.ajax({
        'url': url,
        'dataType': 'json',
        'data': {
            'action': 'getVersion'
        }
    }).done(function (obj) {
        $version.text('Version: ' + obj.version);
    })
}

// host location
// =============
$("#operateHostLocation").click(function () {
    var url = '/f5api';
    $.ajax({
        'url': url,
        'dataType': 'json',
        'data': {
            'action': 'getHostIP'
        }
    }).done(function (obj) {
        location.hostname = obj.ip;
    });
})
