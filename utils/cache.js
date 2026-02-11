/**
 * Cache Utility Library
 * Redis caching functions for performance optimization
 * 
 * Provides functions for:
 * - Getting and setting cached data
 * - Deleting cache entries
 * - Pattern-based cache invalidation
 * - Entity-level cache management
 */

const { getRedis } = require("../config/redis");

/**
 * Get Cache Value
 * Retrieves a value from Redis cache by key
 * 
 * @param {String} key - Cache key
 * @returns {Object|null} Cached data (parsed JSON) or null if not found/error
 */
async function getCache(key) {
  try {
    const redis = getRedis();
    const data = await redis.get(key);
    // Parse JSON string back to object
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("❌ Cache GET error", err);
    return null;
  }
}

/**
 * Set Cache Value
 * Stores a value in Redis cache with TTL (Time To Live)
 * 
 * @param {String} key - Cache key
 * @param {*} value - Value to cache (will be JSON stringified)
 * @param {Number} ttl - Time to live in seconds (default: 10000 seconds)
 */
async function setCache(key, value, ttl = 10000) {
  try {
    const redis = getRedis();
    // Store with expiration time
    await redis.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error("❌ Cache SET error", err);
  }
}

/**
 * Delete Cache Entry
 * Removes a single cache entry by key
 * 
 * @param {String} key - Cache key to delete
 */
async function deleteCache(key) {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (err) {
    console.error("❌ Cache DEL error", err);
  }
}

/**
 * Delete Cache by Pattern
 * Safely deletes multiple cache entries matching a pattern
 * Uses SCAN instead of KEYS to avoid blocking Redis
 * 
 * @param {String} pattern - Redis key pattern (e.g., "user:*", "po:list:*")
 */
async function deleteByPattern(pattern) {
  try {
    let cursor = "0";
    const redis = getRedis();
    
    // Use SCAN to iterate through keys matching pattern
    // This is safer than KEYS command which can block Redis
    do {
      const reply = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100, // Process 100 keys at a time
      });

      cursor = reply.cursor;
      const keys = reply.keys;

      // Delete all keys in current batch
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } while (cursor !== "0"); // Continue until cursor is back to 0

  } catch (err) {
    console.error("❌ Cache Pattern DEL error", err);
  }
}

/**
 * Invalidate Entity Cache
 * Deletes all cache entries for a specific entity
 * Example: invalidateEntity("user") deletes all "user:*" keys
 * 
 * @param {String} entity - Entity name (e.g., "user", "po", "dmr")
 */
async function invalidateEntity(entity) {
  await deleteByPattern(`${entity}:*`);
}

/**
 * Invalidate Entity List Cache
 * Deletes only list cache entries for a specific entity
 * Example: invalidateEntityList("user") deletes all "user:list:*" keys
 * 
 * @param {String} entity - Entity name (e.g., "user", "po", "dmr")
 */
async function invalidateEntityList(entity) {
  await deleteByPattern(`${entity}:list:*`);
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPattern,
  invalidateEntity,
  invalidateEntityList,
};
