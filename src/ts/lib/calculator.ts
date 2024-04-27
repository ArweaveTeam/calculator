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
  blocksPerDay: number = (24 * 60 * 60) / 129
  statBlockCount: number = 119
  profitPerDay: number = 0

  height: number = 0
  blockRewardCount: number = 0

  blockHeightHash: { [height: number]: Block } = {}

  weaveSize: number = 181841493532918 // https://arweave.net/block/current
  networkPartitionCount: number = 50

  realBlockTime: number = 120
  
  async init() {
    await Promise.all([
      this.loadHeight().catch(console.trace),
      this.loadMetrics().catch(console.trace),
      this.loadCurrentBlock().catch(console.trace),
    ])
  }

  async loadHeight() {
    const cached = cache.get('block-height')

    if (cached) {
      this.height = +cached
    } else {
      const res = await client.get('height')
      this.height = +res.data

      cache.set('block-height', this.height.toString(), 2)
    }
    this.blockDataRefresh(this.height)
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
    const USABLE_FRACTION_OF_WEAVE = 0.8
    return (4 * this.networkPartitionCount * USABLE_FRACTION_OF_WEAVE +
      400 * this.networkPartitionCount * USABLE_FRACTION_OF_WEAVE * USABLE_FRACTION_OF_WEAVE) *
      fullReplicaCount
  }

  partialReplicaHashrate(partialReplicaCount: number) {
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

  blockDataRefresh(height: number = this.height) {
    let block: Block | undefined

    for (let i = 0; i < 100; i++) {
      block = this.blockHeightHash[height - i]
      if (block) {
        break
      }
    }

    if (block) {
      let net_hashrate_v1 = 0
      let count = 0
      let prev_block: Block | null = null
      let real_block_time_sum = 0
      let hash_count_sum = 0
      for (const k in this.blockHeightHash) {
        const block = this.blockHeightHash[k]
        if (prev_block) {
          const real_block_time = block.timestamp - prev_block.timestamp
          const hash_count = this.diffToAvgHashCount(block.diff)
          hash_count_sum += hash_count
          real_block_time_sum += real_block_time
          net_hashrate_v1 += hash_count / block.timestamp // Need to adjust for block_time
          count++
        }
        prev_block = block
      }
      const netHashrate = hash_count_sum / real_block_time_sum
      net_hashrate_v1 /= count

      this.networkHashrate = Math.round(netHashrate)
      this.realBlockTime = real_block_time_sum / count
    }
  }

  diffToAvgHashCount(diff: number) {
    const maxBn = BigInt(1) << BigInt(256)
    const valueBn = BigInt(diff)

    const passHashCountBn = maxBn - valueBn
    const fullHashCountBn = maxBn
    const avgHashCount = +fullHashCountBn.toString() / +passHashCountBn.toString()

    return avgHashCount
  }
}

export const calculator = new Calculator()
calculator.init()
