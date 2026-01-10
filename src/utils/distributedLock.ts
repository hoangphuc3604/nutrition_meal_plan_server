import Redis from "ioredis";

/**
 * Simple distributed lock using Redis SET NX EX
 * Coordinates recipe scraping across nutrition_backend and nutrition_meal_plan_server
 */
export class DistributedLock {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Acquire lock for a key
   * @param key - Lock key (e.g., 'recipe:url:base64hash')
   * @param ttlSeconds - Time to live in seconds
   * @returns true if lock acquired, false otherwise
   */
  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      "1",
      "EX",
      ttlSeconds,
      "NX"
    );
    return result === "OK";
  }

  /**
   * Release lock for a key
   * @param key - Lock key
   */
  async release(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }

  /**
   * Check if lock exists
   * @param key - Lock key
   * @returns true if locked, false otherwise
   */
  async isLocked(key: string): Promise<boolean> {
    const exists = await this.redis.exists(`lock:${key}`);
    return exists === 1;
  }
}
