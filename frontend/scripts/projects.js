var linkpre = location.protocol + '//' + location.hostname + ":";
var $projectList = $("#projectList");

var $mainFrame = $("#mainFrame");

// vms
var projvm, newvm, r2vm;

projvm = new Vue({
  el: "#projectList",
  data: {
    projects: [],

  },
  ready: function () {
    this.load();
  },
  computed: {
    list: {
      get: function () {
        return this.porjects;
      },
      set: function (list) {
        var obj, name;
        for (var i = 0, len = list.length; i < len; ++i) {
          obj = list[i];
          obj.link = linkpre + obj.port;
          name = obj.dir && obj.dir.split(/(\\|\/)/).pop() || "<NO NAME>";
          obj.name = name;
        }
        projvm.projects = list;
      }
    }
  },
  methods: {
    load: function () {
      var url = '/f5api';
      $.getJSON('/f5api', {
        action: 'getServers'
      }, function (list) {
        projvm.list = list;
      });
    },


    select: function (proj, eve) {
      console.log('click', proj, eve);
      // var $target = $(eve.target);
      // var $proj = $target.hasClass("project") ? $target : $target.parents(".project");
      // $proj.addClass('selected').siblings().removeClass('selected');
      // TODO:
      $.each(this.projects, function(_, p){
        if(p!=proj){
          p.selected = false;
        }
      });
      proj.selected = true;
    },
    restart: function (dir, port) {
      this.createServer({
        dir: dir,
        prot: port
      }, function (rsp) {
        var obj = JSON.parse(rsp);
        var url = location.protocol + "//" + location.hostname + ":" + port;
        projvm.setMainFrame(url);
      });
    },
    checkStatus: function (proj, eve) {
      if (proj.status != 'running') {
        eve.preventDefault();
        eve.stopPropagation();

        newvm.createServer({
          dir: proj.dir,
          port: proj.port
        }, function (obj) {
          console.log('restart resp', obj);
          proj.port = obj.port;
          var url = location.protocol + "//" + location.hostname + ":" + proj.port;
          projvm.setMainFrame(url);
        });
      }
    },
    setMainFrame: function (url) {
      $mainFrame.attr('src', url);
    },

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
});

// new server creating vm
newvm = new Vue({
  el: "#newProject",
  data: {
    dirs: [],
    newserver: {
      dir: '',
      port: undefined
    },
    creating: false
  },
  ready: function () {
    var vm = this;
    var $newpath = $("#newpath");
    $newpath.on('input click', function (eve) {
      eve.stopPropagation();
      if (!vm.dirs.length) {
        vm.load(vm.newserver.dir);
      }
    });

    // blur then hide
    $(document).click(function () {
      newvm.dirs = [];
    });
  },
  methods: {
    load: function (dir) {
      console.log('load', dir);
      var vm = this;
      dir = dir || vm.newserver.dir || "";
      $.getJSON('/f5api', {
        dir: dir,
        action: 'getDirectories'
      }, function (list) {
        vm.dirs = list;
      });
    },
    select: function (dir, eve) {
      console.log('click select', dir);
      var vm = this;
      eve.stopPropagation();
      dir = dir.path || dir;

      vm.newserver.dir = dir;
    },
    createServer: function (config, callback) {
      var vm = this;
      var apiurl = '/f5api?action=createServer';
      $.post(apiurl, {
        dir: config.dir,
        port: config.port,
        action: 'createServer'
      }, function (rsp) {
        var obj = JSON.parse(rsp);
        console.log('[ newvm ] create server of', config, ', and get respone ', obj);
        // reload projects;
        projvm.load();
        if (callback) {
          callback(obj);
        }
      });
    },
    create: function () {
      var vm = this;
      var dir = vm.newserver.dir;
      var port = vm.newserver.port;
      if (!dir) {
        // TODO: pop $directories
        return;
      }

      vm.creating = true;

      vm.createServer({
        dir: dir,
        port: port
      }, function () {
        vm.creating = false;
        vm.newserver = {
          dir: '',
          port: ''
        };
      });
    },
    reloadProj: function () {
      projvm.load();
    }
  }
});

newvm.$watch('newserver.dir', function () {
  var vm = this;
  console.log('newserver change to', vm.newserver);
  vm.load(vm.newserver.dir);
});


// input directory
var $directories = $("#directories");
var $newpath = $("#newpath");


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
  });
});


// r2 vm
r2vm = new Vue({
  el: "#r2info",
  data: {
    version: '0.0.0'
  },
  ready: function () {
    var vm = this;
    $.getJSON('/f5api', { action: 'getVersion' }, function (info) {
      vm.version = info.version;
    });
  }
});

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
});
