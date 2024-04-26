import { cache } from './lib/cache'
import { calculator } from './lib/calculator'
import { exchangeRates } from './lib/ExchangeRate'
import { $ } from './lib/SimpleQuery'
import { addWhitespace } from './lib/utils'

export function calculateHdd(arToUsd: number) {
  let totalCapacity = 0
  let totalPartitions = 0
  let totalRs = 0
  let readRateRows = $('.jsRs').all() as HTMLInputElement[]
  for (let i = 0; i < readRateRows.length; i++) {
    const drives = +($('.jsHdd').get(i) as HTMLInputElement).value.trim()
    const readRate = +readRateRows[i].value.trim()
    const capacity = +($('.jsCapacity').get(i) as HTMLInputElement).value.trim()

    const drivesXreadSpeed = drives * readRate
    const rowPartitions = (capacity * drives) / 4
    const rs = Math.min(drivesXreadSpeed, rowPartitions * 200)

    totalPartitions += rowPartitions
    totalRs += rs
    totalCapacity += capacity * drives
  }

  let finalRs = totalPartitions * 200

  $('#jsPartition').html(addWhitespace(totalPartitions))
  $('#jsTerabyte').html(addWhitespace(totalCapacity))
  $('#jsReadSpeed').html(addWhitespace(totalRs))
  $('#jsTotalSpeed').html(addWhitespace(finalRs))

  hashrateRecalcFromHdd({
    partitionCount: totalPartitions,
    arToUsd,
  })
}

async function hashrateRecalcFromHdd(data: { partitionCount: number; arToUsd: number }) {
  const networkPartitionCount = Math.floor(calculator.networkWeaveSize / 3.6e12)
  let weaveRateMax = calculator.weaveSizeTb / (networkPartitionCount * (3.6e12 / 1024 ** 4))
  weaveRateMax = Math.min(weaveRateMax, 1)

  const fullReplicaCountFloat = data.partitionCount / networkPartitionCount
  const fullReplicaCount = Math.floor(fullReplicaCountFloat)
  const partialReplicaCount = fullReplicaCountFloat - fullReplicaCount
  const weaveRatePartition = partialReplicaCount

  calculator.hashrate =
    (4 * networkPartitionCount * weaveRateMax + 400 * networkPartitionCount * weaveRateMax * weaveRateMax) *
      fullReplicaCount +
    (4 * networkPartitionCount * weaveRatePartition +
      400 * networkPartitionCount * weaveRatePartition * weaveRatePartition) *
      partialReplicaCount

  if (calculator.hashrate > 1) {
    calculator.hashrate = Math.round(calculator.hashrate)
  } else {
    calculator.hashrate = Math.round(calculator.hashrate * 100) / 100
  }

  const res = calculator.hashrateRelatedRecalc()
  const fiat = cache.get('fiat') || 'usd'
  const dates = cache.get('dates') || 'month'

  const rate = await exchangeRates.convert(fiat.toUpperCase())
  const days = dates === 'year' ? 365 : dates === 'month' ? 30 : dates === 'week' ? 7 : 1

  $('.jsReward').text((+res.profit_per_day * days).toFixed(5) + ' AR')
  $('.jsUsd').html('~' + addWhitespace(+(+res.profit_per_day * (data.arToUsd * rate * days)).toFixed(2)))
  $('.jsMyHs').html(addWhitespace(+res.hashrate.toFixed(2)))
  $('.jsNetHs').html(addWhitespace(+calculator.networkHashrate.toFixed(2)))
}

export async function calculateHashrate(arToUsd: number) {
  calculator.hashrate = +($('#hashrate').get(0) as HTMLInputElement).value.trim()

  const res = calculator.hashrateRelatedRecalc()
  const fiat = cache.get('fiat') || 'usd'
  const dates = cache.get('dates') || 'month'

  const rate = await exchangeRates.convert(fiat.toUpperCase())
  const days = dates === 'year' ? 365 : dates === 'month' ? 30 : dates === 'week' ? 7 : 1

  $('.jsReward').text((+res.profit_per_day * days).toFixed(5) + ' AR')
  $('.jsUsd').html('~' + addWhitespace(+(+res.profit_per_day * (arToUsd * rate * days)).toFixed(2)))
  $('.jsMyHs').html(addWhitespace(+res.hashrate.toFixed(2)))
  $('.jsNetHs').html(addWhitespace(+calculator.networkHashrate.toFixed(2)))
}
