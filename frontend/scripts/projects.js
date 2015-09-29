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
    var path = $newpath.val();
    var apiurl = '/f5api?action=createServer';
    $newpath.attr('readOnly', true);
    $.post(apiurl, {
        'dir': path,
        'action': 'createServer'
    }, function (resp) {
        // loadProjects();
        $newpath.attr('readOnly', false);
        var obj = JSON.parse(resp);
        if (obj.success == 1) {
            loadProjects();
        }
        $newpath.val('');
    })

});

// view
$projectList.on('click', '.project', function () {
    var $this = $(this);
    $this.addClass('selected').siblings().removeClass('selected');
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
