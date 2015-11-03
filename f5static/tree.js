// fold handling
// -------------
var toggleFold = function (obj) { // toggle fold by toggle className
    var cn = obj.parentNode.className;
    if (/\bfolded\b/.test(cn)) { // if folded
        cn = cn.replace(/\bfolded\b/, '') + ' unfold';
    } else {
        cn = cn.replace(/\bunfold\b/g, '') + ' folded'; // if unfold
    }
    obj.parentNode.className = cn.replace("  ", " ")
}

// select handling
// ---------------
var fileLi = document.querySelectorAll("ul li:not(.subdir)");
var seletedClassName = "seleted_item"
var fileNum = fileLi.length;

var selectHandleFunc = function(){
    for(var i = 0;i < fileNum;i ++){
        //console.log( fileLi[i]);
        (function( index ){
            fileLi[index].addEventListener("click",function(){
                rmSelect()
                selectItem( fileLi[index] )
            });
        })(i);
    }
}
var selectItem = function( item ){
    item.className = item.className + " " + seletedClassName;
    var urlString = item.getElementsByTagName("a")[0].href;
    setUrlContainer(urlString)
}

var rmSelect = function(){
    for(var i = 0;i < fileNum;i ++){
        (function(index){
            var cn = fileLi[index].className;
            fileLi[index].className = cn.replace(seletedClassName,"");
        })(i);
    }
}
var setUrlContainer = function( url ){
    var base = location.hostname;
    var container = document.getElementById("urlContainer");
    container.value = url;
    container.select();
}
//selectHandleFunc();

// image holder handling
// ---------------------
var $image_holder = $("<div id='image_holder' style='max-width: 300px;-webkit-transition:all 0.3s linear' />").appendTo($("body")).hide();
var $wrapper = $(".wrapper");
var imgmimes = ['images/bmp', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'];
$wrapper.on('mouseover', '.file-entry', function () {
    var $this = $(this).find('.file');
    var mime = $this.attr('data-mime');
    var href = $this.attr('href');
    if (imgmimes.indexOf(mime) > -1) {
        $image_holder.show().html( "<img src='" + href + "' width='100%' />"  );
    }
}).on('mouseout', '.file-entry', function () {
    $image_holder.hide();
});

// file manage : delete
// --------------------

$(".delete").bind("click",function(){
    var $parent = $(this).parent();
    var file = $parent.find(".file").attr("href");
    $parent.slideUp(function(){
        socket.emit("delete",file);
    });
});


// kill f5
// -------
$("#quit").bind("click",function(){
    socket.emit("quit");
    window.open('', '_self', '');
    window.close();
});


function path2links(pwd, root){
    var html = [];
    var rltpath = pwd.replace(root,'');
    var seps = rltpath.match(/[(\/|\\)]/g);
    var sep = seps && seps[0] || '/';
    var dirs = dirlist(rltpath);

    html.push(tpl({
        url: '/',
        name: root
    }));
    var name, url;

    for(var i = 0, len = dirs.length; i<len; i++){
        url = '/' + dirs.slice(0,i).join('/');
        html.push(tpl({
            url: url,
            name: dirs[i]
        }));
    }

    function dirlist(rltpath){
        var res = [];
        var list = rltpath.split(/[(\/|\\)]/g);
        for(var i = 0, len = list.length; i < len; i++){
            if(!list[i]){
                continue;
            }
            res.push(list[i]);

        }
        return res;
    }

    return html.join(sep);

}

function tpl(data){
    var atpl = "<a href='{{url}}' class='link-item'>{{name}}</a>";
    return atpl.replace(/{{(.*?)}}/gmi, function(_,p){
        return data[p];
    });
};

function renderLinks() {
    var $pwd = $("#pwd");
    var pwd = $pwd.attr('data-pwd');
    var root = $pwd.attr('data-root');
    var mainport = $pwd.attr('data-mainport');
    var home = tpl({
        url : '//' + location.hostname + ":" + mainport,
        name: "&#8962;"
    });
    $pwd.html(home + " " + path2links(pwd, root));
}

renderLinks();
