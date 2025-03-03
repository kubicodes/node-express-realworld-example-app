import Redis from 'ioredis';

let client: Redis | null = null;

export function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host: 'localhost',
      port: 6379,
      password: '',
      username: 'default',
      retryStrategy: (times) => {
        // Exponential backoff with max 2000ms delay
        return Math.min(times * 50, 2000);
      },
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('Successfully connected to Redis');
    });
  }

  return client;
}

export async function set<T>(
  redis: Redis,
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    const serializedValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, error);
    // We don't throw here to ensure the app works without cache
  }
}

export async function get<T>(redis: Redis, key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error getting cache key ${key}:`, error);
    return null;
  }
}

export async function del(redis: Redis, key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Error deleting cache key ${key}:`, error);
  }
}
