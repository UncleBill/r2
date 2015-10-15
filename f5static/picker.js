var $pickForm = $("#pickForm");
var rootpath = $("#rootPath").attr('data-root');
$pickForm.submit(function (e) {
    e.preventDefault();
    e.returnValue = false;
    
    var $this = $(this);
    var $sel = $this.find("[name=selfile]:checked");
    $.ajax({
        type: 'post',
        url: '/f5api?action=pick',
        data: $pickForm.serialize(),
        dataType: 'text',
        success: function (htmlcode) {
            $("#pick-file-tree").html(htmlcode)
        }
    })
})


restore();

// restore from localStorage
function restore() {
    var data = JSON.parse(localStorage.getItem(rootpath));
    if (!data || !data.tree) {
        return;
    }
    renderTree(data.tree, data.files);
    renderFiletype(data.files);
    var checkboxs = data.files.concat( data.folders );
    for (var i = 0,len = checkboxs.length; i < len; ++i) {
        $('input[value="'+checkboxs[i]+'"]').prop('checked', true);
    }
}

function renderFiletype(files) {
    var file,
        ext,
        i, len;
    var lastIndex;
    var exts = [];
    len = files.length;
    for (i = 0; i < len; ++i) {
        file = files[i];
        lastIndex = file.lastIndexOf('.');
        ext = file.slice(lastIndex+1);
        if (ext.length && exts.indexOf(ext) < 0) {
            exts.push(ext);
        }
    }
    var html = '';

    for (i = 0, len = exts.length; i < len; ++i) {
        html += "<label>" +
         "<input type='checkbox' value='" + exts[i] + "' checked />" +
         exts[i] +
         "</label>";
    }
    $("#filetypes").html(html);
}

$("#filetypes").on('click', 'input', function () {
    var $this = $(this);
    var type = $this.val();
    if (this.checked) {
        return;
    } else {
        
    }
})


// ================================================================================
var $pickBtn = $("#pickBtn");
var $fileTree = $("#fileTree");
var $pickFileTree = $("#pickFileTree");
var rootdir = $("#pwd").attr('data-root');

$pickBtn.click(function () {
    var data = queryTreeData($fileTree);
    $.ajax({
        type: 'post',
        url: '/f5api',
        data: {
            files: data.files,
            action: 'pickFiles',
            rootdir: rootdir
        }
    }).done(function (log) {
        console.log(log);
    })
});

$fileTree.on('click', 'input[type=checkbox]', function () {
    var ischecked = this.checked;
    if (this.name == 'selfolder') {
        $(this).closest(".subdir").find("input[type=checkbox]").each(function () {
            this.checked = ischecked;
        });
    }
    var treedata = queryTreeData($fileTree);
    // renderTree(treedata.tree, treedata.files);
    cloneTree();
    $(".wrapper").toggleClass('splited', treedata.files.length > 0);
    renderFiletype(treedata.files);
});

function queryTreeData($container) {
    var $files = $container.find("[name=selfile]:checked");
    var $folders = $container.find("[name=selfolder]:checked");
    var files = [],
        folders = [];
    var tree = {};

    $files.each(function () {
        files.push(this.value);
        fpath2tree(this.value, tree);
    });
    $folders.each(function () {
        folders.push(this.value);
    });

    var data = {
        tree: tree,
        files: files,
        folders: folders
    };
    if (window.localStorage) {
        localStorage.setItem(rootdir, JSON.stringify(data));
    }
    return data;
}

function renderTree(tree, files) {
    var htmlcode = "<div>Total: " + files.length + "</div>";
    htmlcode += buildHtml( tree );
    if (files.length) {
        $(".wrapper").addClass('splited');
        $pickFileTree.html(htmlcode)
    } else {
        $(".wrapper").removeClass('splited');
        $pickFileTree.html('');
    }
}

function cloneTree() {
    $pickFileTree.html('');
    var clone = $fileTree.children().clone().appendTo("#pickFileTree");
    var $files = $pickFileTree.find('.file-entry');
    var $folders = $pickFileTree.find('.subdir');

    // return;
    // remove unselected files
    $files.each(function () {
        var $this = $(this);
        var $input = $this.find('input[name=selfile]');
        // if ($input && $input[0] && $input[0].checked) {
        if (!$input[0].checked) {
            $this.remove();
        }
    });

    // remove folders have no child been selected
    $folders.each(function () {
        var $this = $(this);
        var selected = false;
        var $files = $this.find('.file-entry');
        $files.each(function () {
            var $file = $(this);
            var $input = $file.find('input[name=selfile]');
            if ($input[0].checked) {
                selected = true;
            }
        })

        if (!selected) {
            $this.remove();
        }
    })
}

function fpath2tree(fpath, tree) {
    var first = fpath.indexOf('/');
    var next = fpath.indexOf('/', first+1);
    var folder;
    if (next != -1) {
        folder = fpath.substring(first+1, next);
        if (tree[folder]) {
            return fpath2tree(fpath.substring(next+1), tree[folder])
        } else {
            var newFolder = {}
            tree[folder] = fpath2tree(fpath.substring(next), newFolder)
            return tree;
        }
    } else {
        tree[fpath.substring(first+1)] = fpath.substring(first+1);
        return tree;
    }
}

function buildHtml(tree) {
    var codepool = [];
    var deep = 0;
    codepool.push("<ul>");
    codepool = buildpool(tree, codepool, deep);
    codepool.push("</ul>");
    return codepool.join('\n');
}

function buildpool(tree, htmlArr, deep) {
    var subtree;
    for (var file in tree) {
        if (tree.hasOwnProperty( file )) {
            if ( (typeof tree[file]) === 'string' ) {
                htmlArr.push(indent(deep) + "<li class='file-entry'>"+("<a class='file' href='"+tree[file]+"'>" + tree[file] )+"</a></li>");
            }
            else
            {
                htmlArr.push(indent(deep) + "<li class='subdir folder'>");
                htmlArr.push(indent(deep+1) + '<a class="folder" href="javascript:void(0);" onclick="toggleFold(this)">' + file + "</a>");
                htmlArr.push(indent(deep+1) + "<ul>");
                subtree = buildpool( tree[file], [], deep+1 ).join("\n")
                htmlArr.push(indent(deep+1) + subtree);
                htmlArr.push(indent(deep+1) + "<!-- end of folder -->");
                htmlArr.push("</ul></li>");
            }
        }
    }

    function indent(n) {
        return (new Array(n+1)).join("  ");
    }

    return htmlArr
}
