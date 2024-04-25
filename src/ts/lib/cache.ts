// Caching class using localstorage and ttl
class Cache {
  private storageKey = '573e669aa5940f003c8321bc1892c034' // random key
  private cache: { [key: string]: { value: any; ttl: number } } = {}
  private storage: Storage = localStorage

  constructor() {
    this.load()
  }

  public set(key: string, value: string, ttlInMinutes: number = 0) {
    this.cache[key] = { value, ttl: ttlInMinutes ? Date.now() + ttlInMinutes * 60000 : 0 }
    this.save()
  }

  public setObj(key: string, value: any, ttlInMinutes: number = 0) {
    this.set(key, JSON.stringify(value), ttlInMinutes)
  }

  public get(key: string): string | undefined {
    const item = this.cache[key]
    if (item && (!item.ttl || item.ttl > Date.now())) {
      return item.value
    }

    if (item) {
      this.remove(key)
    }
  }

  public getObj(key: string): any {
    const item = this.get(key)
    return item ? JSON.parse(item) : undefined
  }

  public remove(key: string) {
    delete this.cache[key]
    this.save()
  }

  private save() {
    this.storage.setItem(this.storageKey, JSON.stringify(this.cache))
  }

  private load() {
    const cache = this.storage.getItem(this.storageKey)
    if (cache) {
      this.cache = JSON.parse(cache)
    }
  }
}

export const cache = new Cache()
