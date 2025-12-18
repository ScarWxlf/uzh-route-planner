const DB_NAME = "uzh-route-cache"
const DB_VERSION = 1

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  ttl: number
}

let db: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains("cache")) {
        database.createObjectStore("cache", { keyPath: "key" })
      }
    }
  })
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const database = await openDB()
    return new Promise((resolve) => {
      const transaction = database.transaction("cache", "readonly")
      const store = transaction.objectStore("cache")
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          resolve(entry.data as T)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function setCachedData(key: string, data: any, ttlMs = 3600000): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve) => {
      const transaction = database.transaction("cache", "readwrite")
      const store = transaction.objectStore("cache")
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      }
      store.put(entry)
      transaction.oncomplete = () => resolve()
    })
  } catch {
    // Ignore cache errors
  }
}
