export class SimpleQuery {
  _elements: HTMLElement[] = []

  get length() {
    return this._elements.length
  }

  constructor(elementQuery: any) {
    if (
      elementQuery instanceof HTMLElement ||
      elementQuery instanceof Document ||
      elementQuery instanceof HTMLDocument
    ) {
      // @ts-ignore
      this._elements = [elementQuery]
      return
    }

    if (typeof elementQuery === 'string') {
      // split the query where , is found
      const queries = elementQuery.split(',')
      for (let i = 0, j = queries.length; i < j; i++) {
        this._parseQuery(queries[i].trim())
      }
      return
    }
  }

  get(index?: number) {
    if (index === undefined) return this._elements[0]
    return this._elements[index]
  }

  all() {
    return this._elements
  }

  each(callback: (element: HTMLElement, index: number) => void) {
    this._elements.forEach(callback)
    return this
  }

  hasClass(className: string) {
    return this._elements.some((element) => element.classList.contains(className))
  }

  replaceClass(oldClasses: string | string[], newClasses: string | string[]) {
    if (!Array.isArray(oldClasses)) oldClasses = [oldClasses]
    if (!Array.isArray(newClasses)) newClasses = [newClasses]

    this._elements.forEach((element) => {
      oldClasses.forEach((oldClass) => {
        element.classList.remove(oldClass)
      })
      newClasses.forEach((newClass) => {
        element.classList.add(newClass)
      })
    })

    return this
  }

  text(text?: string) {
    if (!text) {
      return this._elements.map((element) => element.innerText)
    }

    this._elements.forEach((element) => {
      element.innerText = text
    })

    return this
  }

  html(html: string) {
    if (!html) {
      return this._elements.map((element) => element.innerHTML)
    }

    this._elements.forEach((element) => {
      element.innerHTML = html
    })

    return this
  }

  append(html: string) {
    this._elements.forEach((element) => {
      element.innerHTML += html
    })

    return this
  }

  prepend(html: string) {
    this._elements.forEach((element) => {
      element.innerHTML = html + element.innerHTML
    })

    return this
  }

  before(html: string) {
    this._elements.forEach((element) => {
      element.insertAdjacentHTML('beforebegin', html)
    })

    return this
  }

  after(html: string) {
    this._elements.forEach((element) => {
      element.insertAdjacentHTML('afterend', html)
    })

    return this
  }

  find(selector: string) {
    const foundElements: HTMLElement[] = []
    this._elements.forEach((element) => {
      foundElements.push(...(Array.from(element.querySelectorAll(selector)) as HTMLElement[]))
    })

    this._elements = foundElements
    return this
  }

  closest(selector: string) {
    const closestElements: HTMLElement[] = []
    this._elements.forEach((element) => {
      let closestElement = element.closest(selector)
      if (closestElement) closestElements.push(closestElement as HTMLElement)
    })

    this._elements = closestElements
    return this
  }

  parent() {
    const parentElements: HTMLElement[] = []
    this._elements.forEach((element) => {
      let parentElement = element.parentElement
      if (parentElement) parentElements.push(parentElement)
    })

    this._elements = parentElements
    return this
  }

  parents(selector: string) {
    const parentElements: HTMLElement[] = []
    this._elements.forEach((element) => {
      let parentElement = element.parentElement
      while (parentElement) {
        if (parentElement.matches(selector)) {
          parentElements.push(parentElement)
          break
        }

        parentElement = parentElement.parentElement
      }
    })

    this._elements = parentElements
    return this
  }

  children(selector: string) {
    // .children('.jsHdd')
    const childrenElements: HTMLElement[] = []
    this._elements.forEach((element) => {
      childrenElements.push(
        ...(Array.from(element.children).filter((child) => child.matches(selector)) as HTMLElement[])
      )
    })

    this._elements = childrenElements
    return this
  }

  first() {
    this._elements = [this._elements[0]]
    return this
  }

  last() {
    this._elements = [this._elements[this._elements.length - 1]]
    return this
  }

  remove() {
    this._elements.forEach((element) => {
      element.remove()
    })

    return this
  }

  on(event: string, callback: EventListenerOrEventListenerObject) {
    this._elements.forEach((element) => {
      element.addEventListener(event, callback)
    })

    return this
  }

  off(event: string, callback: EventListenerOrEventListenerObject = () => {}) {
    this._elements.forEach((element) => {
      element.removeEventListener(event, callback)
    })

    return this
  }

  toggleClass(classNames: string | string[]) {
    if (!Array.isArray(classNames)) classNames = [classNames]

    this._elements.forEach((element) => {
      classNames.forEach((className) => {
        element.classList.toggle(className)
      })
    })

    return this
  }

  addClass(classNames: string | string[]) {
    if (!Array.isArray(classNames)) classNames = [classNames]

    this._elements.forEach((element) => {
      classNames.forEach((className) => {
        element.classList.add(className)
      })
    })

    return this
  }

  removeClass(classNames: string | string[]) {
    if (!Array.isArray(classNames)) classNames = [classNames]

    this._elements.forEach((element) => {
      classNames.forEach((className) => {
        element.classList.remove(className)
      })
    })

    return this
  }

  // CSS is { property: value }
  // or [{ property: value }, { property: value }]
  // or property, value
  // Example: { color: 'red', backgroundColor: 'black' }
  // Replace the keys with camelCase with the hyphenated version
  // Example: { backgroundColor: 'black' } becomes { 'background-color': 'black' }
  css(property: string | object | object[], value?: string) {
    if (typeof property === 'object') {
      this._elements.forEach((element) => {
        for (const key in property) {
          element.style[this._camelToHyphen(key)] = property[key]
        }
      })
    } else if (Array.isArray(property)) {
      property.forEach((css) => {
        this.css(css)
      })
    } else if (typeof property === 'string' && value) {
      this._elements.forEach((element) => {
        element.style[this._camelToHyphen(property)] = value
      })
    }

    return this
  }

  _camelToHyphen(str: string) {
    return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
  }

  _parseQuery(query: string) {
    try {
      switch (query[0]) {
        case '#':
          this._elements = [document.getElementById(query.slice(1))!]
          break
        case '.':
          this._elements = Array.from(document.getElementsByClassName(query.slice(1))) as HTMLElement[]
          break
        default:
          this._elements = Array.from(document.querySelectorAll(query))
          break
      }
    } catch (error) {
      console.log(error)
    }
  }
}

export const $ = function (elementQuery) {
  return new SimpleQuery(elementQuery)
}
