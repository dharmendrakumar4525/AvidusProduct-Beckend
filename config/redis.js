/**
 * Redis Configuration
 * Manages Redis connection for caching
 * 
 * Redis is used for:
 * - Caching frequently accessed data
 * - Improving API response times
 * - Reducing database load
 */

const redis = require("redis");

// Redis client instance (singleton)
let client;

/**
 * Initialize Redis Connection
 * Creates and connects to Redis server
 * Sets up event listeners for connection status
 * 
 * @returns {Promise<Object>} Redis client instance
 */
async function initRedis() {
  // Return existing client if already initialized
  if (client) return client;

  // Create Redis client with connection URL
  client = redis.createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379", // Default to localhost
  });

  // Event: Connection established
  client.on("connect", () => {
    console.log("✅ Redis connected");
  });

  // Event: Connection error
  client.on("error", (err) => {
    console.error("❌ Redis error", err);
  });

  // Connect to Redis server
  await client.connect();
  return client;
}

/**
 * Get Redis Client
 * Returns the initialized Redis client instance
 * 
 * @returns {Object} Redis client instance
 * @throws {Error} If Redis is not initialized
 */
function getRedis() {
  if (!client) {
    throw new Error("Redis not initialized");
  }
  return client;
}

// Export Redis functions
module.exports = { initRedis, getRedis };
