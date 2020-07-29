const vnodeType = {
  HTML: 'HTML',
  TEXT: 'TEXT',
  COMPONENT: 'COMPONENT',
  CLASS_COMPONENT: 'CLASS_COMPONENT'
}

const childType = {
  EMPTY: 'EMPTY',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE'
}

function createElement(tag, data, children) {
  let flag
  if(typeof tag === 'string') {
    flag = vnodeType.HTML
  } else if (typeof tag === 'function') {
    flag = vnodeType.COMPONENT
  } else {
    flag = vnodeType.TEXT
  }

  let childFlag
  if(children == null) {
    childFlag = childType.EMPTY
  } else if(Array.isArray(children)) {
    let length = children.length
    if(length === 0) {
      childFlag = childType.EMPTY
    } else {
      childFlag = childType.MULTIPLE
    }
  } else {
    childFlag = childType.SINGLE
    children = createTextVnode(children + '')
  }

  return {
    flag,
    tag,
    data,
    key: data && data.key,
    children,
    childFlag,
    el: null
  }
}

function createTextVnode(text) {
  return {
    flag: vnodeType.TEXT,
    tag: null,
    data: null,
    children: text,
    childFlag: childType.EMPTY
  }
}

function render(vnode, container) {
  if(container.vnode) {
    patch(container.vnode, vnode, container)
  } else {
    mount(vnode, container)
  }
  container.vnode = vnode
}

function patch(pre, next, container) {
  let preFlag = pre.flag
  let nextFlag = next.flag
  if(preFlag !== nextFlag) {
    replaceVnode(pre, next, container)
  } else if(nextFlag == vnodeType.HTML) {
    patchElement(pre, next, container)
  } else if(nextFlag == vnodeType.TEXT) {
    patchText(pre, next)
  }
}

function replaceVnode(pre, next, container) {
  container.removeChild(pre.el)
  mount(next, container)
}

function patchElement(pre, next, container) {
  if(pre.tag !== next.tag) {
    return replaceVnode(pre, next, container)
  }

  let el = (next.el = pre.el)
  let prevData = pre.data
  let nextDate = next.data

  if(nextDate) {
    for(let key in nextDate) {
      let preVal = prevData[key]
      let nextVal = nextDate[key]
      patchData(el, key, preVal, nextVal)
    }
  }

  if(prevData) {
    for(let key in prevData) {
      let preVal = prevData[key]
      if(preVal && !nextDate.hasOwnProperty(key))
      patchData(el, key, preVal, null )
    }
  }

  // data更新完毕`
  patchChildren(pre.childFlag, next.childFlag, pre.children, next.children, container)
}

function patchChildren(preChildrenFlag, nextChildrenFlag, preChildren, nextChildren, container) {
  switch (preChildrenFlag) {
    case childType.SINGLE:
      switch (nextChildrenFlag) {
        case childType.SINGLE:
          patch(preChildren, nextChildren, container)
          break
        case childType.EMPTY:
          container.removeChild(preChildren.el)
          break
        case childType.MULTIPLE:
          container.removeChild(preChildren.el)
          for(let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          }
          break
      }
      break
    case childType.EMPTY:
      switch (nextChildrenFlag) {
        case childType.SINGLE:
          mount(nextChildren, container)
          break
        case childType.EMPTY:
          break
        case childType.MULTIPLE:
          for(let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          }
          break
      }
      break
    case childType.MULTIPLE:
      switch (nextChildrenFlag) {
        case childType.SINGLE:
          for(let i = 0; i < preChildren.length; i++) {
            container.removeChild(preChildren[i].el)
          }
          mount(nextChildren, container)
          break
        case childType.EMPTY:
          for(let i = 0; i < preChildren.length; i++) {
            container.removeChild(preChildren[i].el)
          }
          break
        case childType.MULTIPLE:
          let lastIndex = 0
          for (let i = 0; i < nextChildren.length; i++) {
            let nextVnode = nextChildren[i]
            let flag = false
            let j = 0
            for(j; j < preChildren.length; j++) {
              let preVnode = preChildren[j]
              if(nextVnode.key === preVnode.key) {
                flag = true
                patch(preVnode, nextVnode, container)
                if(j < lastIndex) {
                  let flagNode = nextChildren[i - 1].el.nextSibling
                  container.insertBefore(preVnode.el, flagNode)
                  break
                } else {
                  lastIndex = j
                }
              }
            }
            if(!flag) {
              let flagNode = i == 0 ? preChildren[0].el : nextChildren[i - 1].el.nextSibling
              mount(nextVnode, container, flagNode)
            }
          }
          for (let i = 0; i < preChildren.length; i++) {
            const prevVnode = preChildren[i]
            const has = nextChildren.find(next => next.key === prevVnode.key)
            if(!has) {
              console.log(container)
              container.removeChild(prevVnode.el)
            }
          }
          break
      }
      break
  }
}

function patchText(pre, next) {
  let el = (pre.el = next.el)
  if(next.children !== pre.children) {
    el.nodeValue = next.nodeValue
  }
}

function mount(vnode, container, flagNode) {
  let { flag } = vnode
  if(flag == vnodeType.HTML) {
    mountElement(vnode, container, flagNode)
  } else if (flag == vnodeType.TEXT) {
    mountText(vnode, container)
  }
}

function mountElement(vnode, container, flagNode) {
  let dom = document.createElement(vnode.tag)
  vnode.el = dom
  const { data, children, childFlag } = vnode
  if(data) {
    for(let key in data) {
      patchData(dom, key, null, data[key])
    }
  }
  if(childFlag !== childType.EMPTY) {
    if(childFlag == childType.SINGLE) {
      mount(children, dom)
    } else if(childFlag == childType.MULTIPLE) {
      for (let i = 0; i < children.length; i++) {
        mount(children[i], dom)
      }
    }
  }
  flagNode ? container.insertBefore(dom, flagNode) : container.appendChild(dom)
}

function patchData(dom, key, prv, next) {
  switch (key) {
    case 'style':
      for(let styleItem in next) {
        dom.style[styleItem] = next[styleItem]
      }
      for(let styleItem in prv) {
        if(!next.hasOwnProperty(styleItem)) {
          dom.style[styleItem] = ''
        }
      }
      break
    case 'class':
      dom.className = next
      break
    case 'id':
      dom.id = next
      break
    default:
      if(key[0] === '@') {
        if(prv) {
          dom.removeEventListener(key.slice(1), prv)
        }
        dom.addEventListener(key.slice(1), next)
      } else {
        dom.setAttribute(key, next)
      }
      break
  }
}

function mountText(vnode, container) {
  let dom = document.createTextNode(vnode.children)
  vnode.el = dom
  container.appendChild(dom)
}
