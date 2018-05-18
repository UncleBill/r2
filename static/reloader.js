document.addEventListener('DOMContentLoaded', function () {
  const URL_RE = /url\(("|')?(.*?)\1?\)/gmi

  /**
   * each for ArrayLike list
   *
   * @param arrLike {ArrayLike}
   * @param callback
   */
  function each (arrLike, callback) {
    for (let i = 0; i < arrLike.length; ++i) {
      callback(arrLike[i], i)
    }
  }

  /**
   * 解析相对 css 文件的图片路径
   * 获得完整路径
   * - 会保留路径的参数
   *
   * @param baseurl
   */
  function resolveTo (baseurl) {
    return function (relativePath) {
      // 绝对路径
      if (relativePath.startsWith('/')) {
        return location.origin + relativePath[0]
      } else if (relativePath.startsWith('data:')
        || (/^\w+?:\/\//).test(relativePath)) {
        return relativePath
      }
      let url = new URL(baseurl)
      let segs = `${url.origin}${url.pathname}`.split('/')
      segs.pop() // 去掉文件名
      let relsegs = relativePath.split('/')
      let seg
      do {
        seg = relsegs[0]
        if (seg === '.') {
          relsegs.shift()
        } else if (seg === '..') {
          relsegs.shift()
          segs.pop()
        } else {
          break;
        }
      } while (seg)
      return segs.concat(relsegs).join('/')
    }
  }

  /**
   * 从 'url(), url()' 中获取相对于路径的目录路径列表
   * background: url(a.jpg), url(sub/b.jpg)
   * => ['/path/a.jpg', '/path/sub/b.jpg']
   *
   * @param urlFuncList - 函数列表
   * @param filepath - 匹配的目标路径
   * @param resolver - 相对路径转换成绝对路径的方法
   */
  function extractUrlList (urlFuncList, filepath, resolver) {
    let urls = urlFuncList.match(URL_RE)
    urls = urls.map(url => url.replace(URL_RE, "$2"))
      .filter(url => !url.startsWith('data:')) // base64 编码的资源
      .map(url => resolver(url)) // 完整路径
      .filter(url => new URL(url).pathname === filepath) // 比较目录
    return urls
  }

  /**
   * 收集引用资源的元素
   *
   * @param tagName = 标签名
   * @param propName = {src, link}
   * @todo 收集 picture, video, audio 等
   */
  function collectElements (tagName, propName) {
    let els = document.getElementsByTagName(tagName)
    return [].filter.call(els,
      el => el[propName].indexOf(location.origin) === 0)
  }

  /**
   * 收集样式文件引用的图片
   * @returns Array
   */
  function collectResourcesInStylesheet () {
    let collections = [];
    function collect (sheet) {
      if (!sheet || sheet.disabled) return;
      // same origin, omit CSS security rules checking
      if (sheet.href && sheet.href.indexOf(location.origin) === 0) {
        let foundRules = [];
        each(sheet.cssRules, (rule, ruleIndex) => {
          // 只获取页面上有效样式、引用css、字体规则
          // background-image or border-image
          if (rule.cssText.match(URL_RE)
            && ((rule.type === CSSRule.STYLE_RULE
              && document.querySelector(rule.selectorText))
              || rule.type === CSSRule.IMPORT_RULE
              || rule.type === CSSRule.FONT_FACE_RULE)) {
            foundRules.push({
              ruleIndex: ruleIndex,
              type: rule.type,
              cssText: rule.cssText
            })
            // 递归依赖
            if (rule.type === CSSRule.IMPORT_RULE) {
              collect(rule.styleSheet)
            }
          }
        })
        // TODO 路径中包含 base64 编码的资源，会占用很大内存
        if (foundRules.length > 0) {
          collections.push({
            sheet: sheet,
            rules: foundRules
          })
        }
      }
    }
    each(document.styleSheets, collect)
    return collections
  }

  /**
   * 更新行内样式的图片
   */
  function reloadImagesFromInlineStyle (filepath) {
    let els = document.querySelectorAll('[style*=url\\(]')
    // 相对路径方法
    let resolve = resolveTo(location.href)
    each(els, el => {
      let styleText = el.getAttribute('style')
      let urls = extractUrlList(styleText, filepath, resolve)
      if (urls.length > 0) {
        let newStyleText = updateUrlFunc(styleText)
        el.setAttribute('style', newStyleText)
      }
    })
  }

  /**
   * 匹配路径的元素
   *
   * @param eles
   * @param propName
   * @param pathname
   */
  function matchElements (eles, propName, pathname) {
      return eles.filter(ele => {
        let url = new URL(ele[propName]);
        return url.pathname === pathname
      })
  }

  var RELOAD_ID = Date.now()
  /**
   * 更新路径
   */
  function updatePath (originPath) {
    RELOAD_ID++
    if (originPath.indexOf('__f5r2_reload__=') > -1) {
      newpath = originPath.replace(/__f5r2_reload__=\d+/, '__f5r2_reload__=' + RELOAD_ID)
    } else {
      let p = (originPath.indexOf('?') === -1 ? '?' : '&') + '__f5r2_reload__='
      newpath = originPath + p + RELOAD_ID
    }
    return newpath
  }

  /**
   * 更新 url() 重点路径
   * 尽可能地保留引号
   */
  function updateUrlFunc (srcRuleText) {
    return srcRuleText.replace(URL_RE, function (_, quote, path) {
      quote = quote || ''
      return `url(${quote}${updatePath(path)}${quote})`
    })
  }

  /**
   * 更新原生的资源
   */
  function livereload (eles, propName, pathname) {
    let matchEles = matchElements(eles, propName, pathname)
    matchEles.forEach(ele => {
      let newPath = updatePath(ele.getAttribute(propName))
      ele.setAttribute(propName, newPath)
    })
  }

  /**
   * 更新样式规则中的资源路径
   */
  function updateCssRule (filepath, type) {
    resourcesInCss.forEach(collection => {
      // 相对路径方法
      let resolve = resolveTo(collection.sheet.href)
      
      let offset = 0; // 每次插入新规则，位置会发生变化
      collection.rules
        .filter(rule => rule.type === type)
        .forEach(rule => {
          rule.ruleIndex += offset
          let urls = extractUrlList(rule.cssText, filepath, resolve)

          // 匹配到包含目标路径的样式规则，插入一条新的以刷新
          if (urls.length > 0) {
            let newCssText = updateUrlFunc(rule.cssText)
            // XXX 已知 Chrome 下，给子importRule的styleSheet插入新的
            // importRule 会丢失样式
            // https://bugs.chromium.org/p/chromium/issues/detail?id=841088
            collection.sheet.insertRule(newCssText, ++rule.ruleIndex)
            offset++
          }
        })
    })
  }

  var scripts = collectElements('script', 'src')
  var images = collectElements('img', 'src')
  var styleSheets = collectElements('link', 'href')
  var resourcesInCss = collectResourcesInStylesheet()

  let timerMap = {}
  function throttle (exec, args, target) {
    let key = args.join('')
    clearTimeout(timerMap[key])
    timerMap[key] = setTimeout(function () {
      target = exec.apply(null, args)
    }, 50)
  }

  var MutationObserver = window.MutationObserver
    || window.WebKitMutationObserver
    || window.MozMutationObserver;

  // 使用了 eruda 的页面内，在MutationObserver 中 console.log 会引起死循环
  // https://github.com/liriliri/eruda/issues/65 
  var observer = new MutationObserver(mutaions => {
    mutaions.forEach(mutaion => {
      let tagName = mutaion.target.tagName.toLowerCase()
      switch (tagName) {
        case 'script':
          throttle(collectElements, ['script', 'src'], scripts)
          break;
        case 'img':
          throttle(collectElements, ['img', 'src'], images)
          break;
        case 'link':
          throttle(collectElements, ['link', 'href'], styleSheets)
          break;
      }
    })
    throttle(collectResourcesInStylesheet, ['RESOURCES_IN_CSS'], resourcesInCss)
  });
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true
  })

  var es = new EventSource('/f5r2-stream');
  es.onmessage = function (e) {
    try {
      // heart beat
      if (e.data === '<3') return;

      let {event, file} = JSON.parse(e.data)
      if (event === 'reload') {
        let fileExt = file.split('.').pop().toLowerCase()
        let filepath = encodeURI('/' + file)

        // html 文件或包含在页面中的 js
        if ((fileExt.match(/^html?$/) &&  location.pathname === filepath)
          || (fileExt === 'js' && matchElements(scripts, 'src', filepath).length > 0)) {
          window.location.reload();
        } 
        // 热更新图片
        else if (fileExt.match(/^(jpe?g|png|gif|bmp|webp|svg|webm|mp4|ogv|flv|f4v|avi)$/i))
        {
          livereload(images, 'src', filepath)
          updateCssRule(filepath, CSSRule.STYLE_RULE)
          reloadImagesFromInlineStyle(filepath)
        }
        // 热更新样式、import 的样式
        else if (fileExt === 'css')
        {
          livereload(styleSheets, 'href', filepath)
          updateCssRule(filepath, CSSRule.IMPORT_RULE)
        }
        // 热更新字体
        else if (fileExt.match(/^(ttf|otf|woff|woff2|svg|eot)$/i))
        {
          updateCssRule(filepath, CSSRule.FONT_FACE_RULE)
        }
      }
    } catch (err) {}
  }
})
