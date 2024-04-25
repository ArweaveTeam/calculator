import { $, SimpleQuery } from './SimpleQuery'

const enterClasses = ['transition', 'transform', 'opacity-100', 'scale-100']

const leaveClasses = ['transition', 'transform', 'opacity-0', 'scale-95']

export function showDropdown($elem: SimpleQuery) {
  $elem.addClass(leaveClasses)
  $elem.removeClass('hidden')

  setTimeout(() => {
    $elem.removeClass(leaveClasses)
    $elem.addClass(enterClasses)
  }, 0)
}

export function hideDropdown($elem: SimpleQuery) {
  $elem.removeClass(enterClasses)
  $elem.addClass(leaveClasses)

  setTimeout(() => {
    $elem.addClass('hidden')
    $elem.removeClass(leaveClasses)
  }, 100)
}

export function hideElementOnClickOutside(elem: HTMLElement, button: HTMLElement) {
  document.addEventListener('click', (e) => {
    if (!elem.contains(e.target as Node) && !button.contains(e.target as Node)) {
      hideDropdown($(elem))
    }
  })
}
