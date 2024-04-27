import axios from 'axios'
import { Block } from '../faces'
import { cache } from './cache'
import { pause, winstonToAr } from './utils'

const client = axios.create({
  baseURL: 'https://arweave.net/',
  timeout: 10000,
})

class Calculator {
  blockReward: number = 0.73
  networkHashrate: number = 2303940
  blockTime: number = 129
  blocksPerDay: number = (24 * 60 * 60) / this.blockTime
  profitPerDay: number = 0
  weaveSize: number = 181841493532918 // https://arweave.net/block/current
  networkPartitionCount: number = 50

  async init() {
    await Promise.all([
      this.loadMetrics().catch(console.trace),
      this.loadCurrentBlock().catch(console.trace),
    ])
  }

  async loadMetrics() {
    let data: string = ''
    const cached = cache.get('metrics')
    if (cached) {
      data = cached
    } else {
      const res = await client.get(`metrics`)
      data = res.data as string
      cache.set('metrics', data, 10)
    }

    // split to new lines
    const lines = data.split('\n')

    // each line is: `<key> <value>`
    const metrics: { [key: string]: string } = {}
    for (const line of lines) {
      if (line.startsWith('#')) {
        continue
      }
      const [key, value] = line.split(' ')
      metrics[key] = value
    }

    this.blockReward = winstonToAr(+metrics['average_block_reward'])
    this.networkHashrate = +metrics['network_hashrate'] / this.blockTime
  }

  async loadCurrentBlock() {
    let data: { weave_size?: string } = {}
    const cached = cache.getObj('block-current')
    if (cached) {
      data = cached
    } else {
      const res = await client.get('block/current')
      data = res.data

      cache.setObj('block-current', data, 2)
    }

    if (data.weave_size) {
      this.weaveSize = +data.weave_size
      this.networkPartitionCount = Math.floor(this.weaveSize / 3.6e12)
    }

    await pause(5)
    this.loadCurrentBlock()
  }

  hashrate(partitionCount: number, readSpeed: number) {
    const requiredReadSoeed = partitionCount * 200
    const fullReplicaCountFloat = partitionCount / calculator.networkPartitionCount
    const fullReplicaCount = Math.floor(fullReplicaCountFloat)
    const partialReplicaCount = fullReplicaCountFloat - fullReplicaCount
    const readRate = Math.min(1.0, readSpeed / requiredReadSoeed)

    // Scale the hashrate down by the read rate to estimate the impact of not being able
    // to read the chunk data fast enough to achieve full hashrate
    const hashrate =
      (calculator.fullReplicaHashrate(fullReplicaCount) +
      calculator.partialReplicaHashrate(partialReplicaCount)) *
      readRate
  
    return hashrate
  }

  fullReplicaHashrate(fullReplicaCount: number) {
    // Constant. Estimate of the fraction of the weave that can be synced and mined
    const USABLE_FRACTION_OF_WEAVE = 0.87
    // Each H1 hash is worth 1/100 of an H2 hash. This is because the SPoA1 difficulty is
    // 100x the SPoA2 difficulty - i.e. each H1 hash has a 1/100 chance of being a solution
    // compared to each H2 hash
    return (4 * this.networkPartitionCount * USABLE_FRACTION_OF_WEAVE +
      400 * this.networkPartitionCount * USABLE_FRACTION_OF_WEAVE * USABLE_FRACTION_OF_WEAVE) *
      fullReplicaCount
  }

  partialReplicaHashrate(partialReplicaCount: number) {
    // Each H1 hash is worth 1/100 of an H2 hash. This is because the SPoA1 difficulty is
    // 100x the SPoA2 difficulty - i.e. each H1 hash has a 1/100 chance of being a solution
    // compared to each H2 hash
    return (4 * this.networkPartitionCount * partialReplicaCount +
      400 * this.networkPartitionCount * partialReplicaCount * partialReplicaCount)
  }

  economicsRecalc(hashrate: number) {
    const rate = hashrate / this.networkHashrate
    this.profitPerDay = rate * this.blockReward * this.blocksPerDay

    return {
      profit_per_day: this.profitPerDay,
    }
  }
}

export const calculator = new Calculator()
calculator.init()
