import { cache } from './lib/cache'
import { calculator } from './lib/calculator'
import { exchangeRates } from './lib/ExchangeRate'
import { $ } from './lib/SimpleQuery'
import { addWhitespace } from './lib/utils'

export function calculateHdd(arToUsd: number) {
  let totalCapacity = 0
  let totalPartitions = 0
  let totalReadSpeed = 0
  let readRateRows = $('.jsRs').all() as HTMLInputElement[]
  for (let i = 0; i < readRateRows.length; i++) {
    const drives = +($('.jsHdd').get(i) as HTMLInputElement).value.trim()
    const readRate = +readRateRows[i].value.trim()
    const capacity = +($('.jsCapacity').get(i) as HTMLInputElement).value.trim()

    const drivesXreadSpeed = drives * readRate
    const rowPartitions = (capacity * drives) / 4
    const rs = Math.min(drivesXreadSpeed, rowPartitions * 200)

    totalPartitions += rowPartitions
    totalReadSpeed += rs
    totalCapacity += capacity * drives
  }

  let requiredReadSpeed = totalPartitions * 200

  $('#jsPartition').html(addWhitespace(totalPartitions))
  $('#jsTerabyte').html(addWhitespace(totalCapacity))
  $('#jsReadSpeed').html(addWhitespace(totalReadSpeed))
  $('#jsTotalSpeed').html(addWhitespace(requiredReadSpeed))

  hashrateRecalcFromHdd({
    partitionCount: totalPartitions,
    readSpeed: totalReadSpeed,
    arToUsd,
  })
}

async function hashrateRecalcFromHdd(data: { partitionCount: number; readSpeed: number; arToUsd: number }) {
  const hashrate = calculator.hashrate(data.partitionCount, data.readSpeed)

  const res = calculator.economicsRecalc(hashrate)
  const fiat = cache.get('fiat') || 'usd'
  const dates = cache.get('dates') || 'month'

  const rate = await exchangeRates.convert(fiat.toUpperCase())
  const days = dates === 'year' ? 365 : dates === 'month' ? 30 : dates === 'week' ? 7 : 1

  $('.jsReward').text((+res.profit_per_day * days).toFixed(5) + ' AR')
  $('.jsUsd').html('~' + addWhitespace(+(+res.profit_per_day * (data.arToUsd * rate * days)).toFixed(2)))
  $('.jsMyHs').html(addWhitespace(+hashrate.toFixed(2)))
  $('.jsNetHs').html(addWhitespace(+calculator.networkHashrate.toFixed(2)))
}

export async function calculateHashrate(arToUsd: number) {
  const hashrate = +($('#hashrate').get(0) as HTMLInputElement).value.trim()

  const res = calculator.economicsRecalc(hashrate)
  const fiat = cache.get('fiat') || 'usd'
  const dates = cache.get('dates') || 'month'

  const rate = await exchangeRates.convert(fiat.toUpperCase())
  const days = dates === 'year' ? 365 : dates === 'month' ? 30 : dates === 'week' ? 7 : 1

  $('.jsReward').text((+res.profit_per_day * days).toFixed(5) + ' AR')
  $('.jsUsd').html('~' + addWhitespace(+(+res.profit_per_day * (arToUsd * rate * days)).toFixed(2)))
  $('.jsMyHs').html(addWhitespace(+hashrate.toFixed(2)))
  $('.jsNetHs').html(addWhitespace(+calculator.networkHashrate.toFixed(2)))
}
