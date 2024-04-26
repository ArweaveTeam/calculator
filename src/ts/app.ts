import axios from 'axios'
import { calculateHashrate, calculateHdd } from './calculate'
import { TABS } from './enums'
import { cache } from './lib/cache'
import { hideDropdown, hideElementOnClickOutside, showDropdown } from './lib/domUtils'
import { exchangeRates } from './lib/ExchangeRate'
import { $ } from './lib/SimpleQuery'
;(() => {
  let hdCopy: string
  let floatyElement = $('.floaty').get(0)
  let floatyRect = floatyElement.getBoundingClientRect()
  let floatyTop = floatyRect.top + window.scrollY

  let currentTab: TABS = TABS.HDD
  let fiat = cache.get('fiat') || 'USD'
  let dates = cache.get('dates') || 'month'

  const arToUsd = async () => {
    let arusd = cache.get('arToUsd')
    let lastPrice: number = arusd ? +arusd : 0
    if (!lastPrice) {
      const res = await axios.get('https://api.redstone.finance/prices/?symbol=AR&provider=redstone&limit=1')
      const data = res.data as { value: number }[]
      lastPrice = +data[0].value.toFixed(3)

      // update every minute
      cache.set('arToUsd', lastPrice.toString(), 1)
    }

    await exchangeRates.convert('USD')

    return lastPrice
  }

  const calculate = async () => {
    if (currentTab === TABS.HDD) {
      calculateHdd(await arToUsd())
    } else {
      calculateHashrate(await arToUsd())
    }
  }

  const copyHardDriveCode = () => {
    // create a copy of #jsFirstHd and remove the id
    const jsFirstHd = $('#jsFirstHd')
    const jsFirstHdCopy = jsFirstHd.get(0).cloneNode(true) as HTMLElement
    jsFirstHdCopy.removeAttribute('id')

    // remove the .jsRemRow opacity-0 class and the disabled attribute
    const jsRemRow = jsFirstHdCopy.querySelector('.jsRemRow') as HTMLElement
    jsRemRow.classList.remove('opacity-0')
    jsRemRow.removeAttribute('disabled')

    // remove all the labels
    const labels = jsFirstHdCopy.querySelectorAll('label')
    labels.forEach((label) => $(label).addClass(['lg:hidden']))

    hdCopy = jsFirstHdCopy.outerHTML
  }

  const events = () => {
    hideElementOnClickOutside($('.jsDates').get(0), $('.jsBtnDates').get(0))
    $('.jsBtnDates').on('click', () => {
      const $jsDates = $('.jsDates')
      // check if it's visible
      if ($jsDates.hasClass('hidden')) {
        showDropdown($jsDates)
      } else {
        hideDropdown($jsDates)
      }
    })

    hideElementOnClickOutside($('.jsFiat').get(0), $('.jsBtnFiat').get(0))
    $('.jsBtnFiat').on('click', () => {
      const $jsFiat = $('.jsFiat')
      // check if it's visible
      if ($jsFiat.hasClass('hidden')) {
        showDropdown($jsFiat)
      } else {
        hideDropdown($jsFiat)
      }
    })

    $('.jsDateItem').on('click', function (e) {
      e.preventDefault()

      dates = $(this).text()[0]
      cache.set('dates', dates.trim().toLowerCase())
      $('.jsDateTxt').text(`Per ${dates.toLocaleLowerCase()}`)
      hideDropdown($('.jsDates'))

      $('.jsDateItem').removeClass('dd-active')
      $(this).addClass('dd-active')

      calculate()
    })

    $('.jsFiatItem').on('click', function (e) {
      e.preventDefault()

      fiat = $(this).text()[0]
      cache.set('fiat', fiat)
      $('.jsFiatTxt').text(fiat)
      hideDropdown($('.jsFiat'))

      $('.jsFiatItem').removeClass('dd-active')
      $(this).addClass('dd-active')

      calculate()
    })

    $('#jsAddRow').on('click', async () => {
      if (currentTab === TABS.HDD) {
        // replace all hdd-0, capacity-0, rs-0, with hdd-<index>, capacity-<index>, rs-<index> on inputs and labels
        const index = $('.jsRow').length
        const copy = hdCopy
          .replace(/hdd-\d+/g, `hdd-${index}`)
          .replace(/capacity-\d+/g, `capacity-${index}`)
          .replace(/rs-\d+/g, `rs-${index}`)

        $('.jsRow').last().after(copy)

        $('.jsRemRow')
          .off('click')
          .on('click', async function () {
            $(this).parents('.jsRow').first().remove()
            calculate()
          })
      }

      $('input').off('keyup').on('keyup', calculate)

      calculate()
    })

    $('input').off('keyup').on('keyup', calculate)

    $('.jsUpdateTab').on('click', function () {
      currentTab = $(this).text()[0].toLowerCase() === 'hashrate' ? TABS.HASHRATE : TABS.HDD
      const toSave = currentTab === TABS.HDD ? 'HDD' : 'HASHRATE'
      cache.set('currentTab', toSave)
      updateTab()
    })

    // Escuchar el evento de scroll
    window.addEventListener('scroll', () => {
      // if window width < 640px, remove the floaty class
      if (window.innerWidth < 640) {
        $('.jsFloaty').removeClass('floaty')
        floatyElement.style.top = '0px'
        return
      } else {
        $('.jsFloaty').addClass('floaty')
      }

      if (window.scrollY > floatyTop) {
        // lets start moving the top
        floatyElement.style.top = `${window.scrollY - floatyTop + 10}px`
      }
    })

    window.addEventListener('resize', () => {
      floatyElement = $('.jsFloaty').get(0)
      floatyRect = floatyElement.getBoundingClientRect()
      floatyElement.style.top = '0px'
      floatyTop = $('.jsFloaty').get(0).getBoundingClientRect().top + window.scrollY
      window.dispatchEvent(new Event('scroll'))
    })
    document.dispatchEvent(new Event('resize'))
  }

  const updateTab = () => {
    $('.jsUpdateTab').removeClass('tab-active')

    if (currentTab === TABS.HDD) {
      $('#jsHashrates').addClass('hidden')
      $('#jsHardDrives').removeClass('hidden')
      $('.jsUpdateTab').first().addClass('tab-active')
    } else {
      $('#jsHardDrives').addClass('hidden')
      $('#jsHashrates').removeClass('hidden')
      $('.jsUpdateTab').last().addClass('tab-active')
    }

    $('.floaty-parent').removeClass('hidden')
    calculate()
  }

  const rewriteDom = () => {
    $('.jsDateTxt').text(`Per ${dates.toLocaleLowerCase()}`)
    $('.jsFiatTxt').text(fiat)

    $('.jsDateItem')
      .removeClass('dd-active')
      .each(function (el) {
        if ($(el).text()[0].toLowerCase() === dates) {
          $(el).addClass('dd-active')
        }
      })

    $('.jsFiatItem')
      .removeClass('dd-active')
      .each(function (el) {
        if ($(el).text()[0] === fiat) {
          $(el).addClass('dd-active')
        }
      })

    let currTab = cache.get('currentTab')
    if (currTab) {
      currentTab = currTab === 'HDD' ? TABS.HDD : TABS.HASHRATE
    } else {
      currentTab = TABS.HDD
    }

    updateTab()
  }

  window.onload = () => {
    copyHardDriveCode()

    rewriteDom()

    events()

    arToUsd().then((res) => {
      calculate()
    })
  }
})()
