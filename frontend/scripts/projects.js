var linkpre = location.protocol + '//' + location.hostname + ":";
var $btnReload = $("#btnReload");
var $btnCreate = $("#btnCreate");
var $projectList = $("#projectList");
var STOREKEY = 'server-list';

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
        var locals = getStoredProjects();
        list = mergeProjects(list, locals);
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

function loadStoredProjects() {
    var list = JSON.parse(localStorage.getItem(STOREKEY));
    if (!list) {
        return;
    }
    console.log('loadStoredProjects', list);
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
            storeConfig({
                dir: obj.dir,
                port: obj.port
            });
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


function storeConfig(config) {
    var list = JSON.parse(localStorage.getItem(STOREKEY)) || [];
    list.push(config);
    localStorage.setItem(STOREKEY, JSON.stringify(list));
}

function storeConfigList(arr) {
    localStorage.setItem(STOREKEY, JSON.stringify(arr));
}

function getStoredProjects() {
    var list = JSON.parse(localStorage.getItem(STOREKEY)) || [];
    for (var i = 0; i < list.length; ++i) {
        list[i].status = 'local';
    }
    return list;
}

function mergeProjects(servers, locals) {
    var merged = servers.concat(locals);
    merged = uniqueArr(merged, function (s1, s2) {
        return s1.dir == s2.dir && s1.port == s2.port;
    });

    return merged;
}


function uniqueArr(arr, juggfunc) {
    var resArr = [];
    var has = false;
    for (var i = 0; i < arr.length; ++i) {
        for (var j = 0; j < resArr.length; ++j) {
            if( juggfunc(resArr[j], arr[i]) ){
                has = true;
            }
        }
        if (has) {
            has = false;
            continue;
        }
        resArr.push(arr[i]);
        has = false;
    }
    return resArr;
}


// reset localStorage
function resetLocalStorage() {
    var url = '/f5api';
    var tpl = $("#projectTpl").html();
    $.ajax({
        'url': url,
        'dataType': 'json',
        'data': {
            'action': 'getServers'
        }

    }).done(function (list) {
        localStorage.setItem(STOREKEY, JSON.stringify(list));
    })
}

function setMainFrame(url) {
    $("#mainFrame").attr('src', url);
}
