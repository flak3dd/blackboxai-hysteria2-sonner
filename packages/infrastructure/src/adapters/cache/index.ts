import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL

export const redis = redisUrl ? new Redis(redisUrl) : null

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null
  const value = await redis.get(key)
  return value ? JSON.parse(value) : null
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!redis) return
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return
  await redis.del(key)
}
