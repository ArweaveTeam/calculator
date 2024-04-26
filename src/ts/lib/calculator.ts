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
  networkWeaveSize: number = 180492624503030
  hashrate: number = 2000
  blockProbPerDay: number = 0
  profitPerDay: number = 0

  height: number = 0
  blockRewardCount: number = 0

  blockHeightHash: { [height: number]: Block } = {}

  hashCountPerBlockAvg: number = 120 * 70e6
  weaveSize: number = 60337091813622 // https://arweave.net/block/current

  realBlockTime: number = 120
  weaveSizeTb: number = Math.round(180492624503030 * 0.8) / 1024 ** 4

  async init() {
    await Promise.all([
      this.loadHeight().catch(console.trace),
      this.loadBlockList().catch(console.trace),
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

  async loadBlockList() {
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
    this.networkWeaveSize = +metrics['weave_size']
    this.weaveSizeTb = Math.round(this.networkWeaveSize * 0.8) / 1024 ** 4
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
    }

    await pause(5)
    this.loadCurrentBlock()
  }

  hashrateRelatedRecalc() {
    const hashCountPerBlockAvg = (24 * 60 * 60 * this.networkHashrate) / this.blocksPerDay
    const pPerHash = 1 / hashCountPerBlockAvg
    this.blockProbPerDay = 1 - Math.pow(1 - pPerHash, 24 * 60 * 60 * this.hashrate)

    return this.economicsRecalc()
  }

  economicsRecalc() {
    const rate = this.hashrate / this.networkHashrate
    this.profitPerDay = rate * this.blockReward * this.blocksPerDay

    return {
      hashrate: this.hashrate,
      network_hashrate: this.networkHashrate,
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
      this.weaveSize = block.weave_size
      this.hashCountPerBlockAvg = hash_count_sum / count
      this.realBlockTime = real_block_time_sum / count

      this.hashrateRelatedRecalc()
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
