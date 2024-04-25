// on every thousand add a whitespace
export function addWhitespace(num: number) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '&nbsp;')
}

export function getScrollTop() {
  if (typeof window.pageYOffset !== 'undefined') {
    // Most browsers
    return window.pageYOffset
  }

  var d = document.documentElement
  if (typeof d.clientHeight !== 'undefined') {
    // IE in standards mode
    return d.scrollTop
  }

  // IE in quirks mode
  return document.body.scrollTop
}

export function winstonToAr(winston: number) {
  return winston / 1e12
}

export async function pause(minutes: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, minutes * 60000)
  })
}
