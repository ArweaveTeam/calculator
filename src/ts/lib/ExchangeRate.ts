import axios from 'axios'
import { cache } from './cache'

class ExchangeRate {
  async convert(to: string): Promise<number> {
    let cached = cache.getObj('exchangeRates')
    let rates: { [key: string]: number } = {}

    if (cached) {
      rates = cached
    } else {
      const res = await axios.get('https://open.er-api.com/v6/latest/USD')
      const data = res.data as {
        result: string
        rates: { [key: string]: number }
      }

      rates = data.rates
      cache.setObj('exchangeRates', rates, 60 * 12)
    }

    return rates[to]
  }
}

export const exchangeRates = new ExchangeRate()
