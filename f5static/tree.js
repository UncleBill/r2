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
$("<div id='image_holder' />").appendTo($("body")).hide();
var $image_holder = $("#image_holder");

$(".ft_image").each( function( index ){
    var $target = $(this);
    $target.hover( function(){
        var $href =  this.href;
        $image_holder.show().html( "<img src='" + $href + "' />"  ).pos;
    },function(){
        $image_holder.hide();
    } );
} );
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
    function tpl(data){
        var atpl = "<a href='{{url}}' class='link-item'>{{name}}</a>";
        return atpl.replace(/{{(.*?)}}/gmi, function(_,p){
            return data[p];
        });
    };

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

function renderLinks() {
    var $pwd = $("#pwd");
    var pwd = $pwd.attr('data-pwd');
    var root = $pwd.attr('data-root');

    $pwd.html(path2links(pwd, root));
}

renderLinks();
