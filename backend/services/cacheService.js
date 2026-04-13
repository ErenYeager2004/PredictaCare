/**
 * cacheService.js
 * Copy to: backend/services/cacheService.js
 *
 * Local Redis cache with graceful fallback.
 * If Redis is not running, all operations silently no-op
 * so the app works fine without Redis.
 */

import Redis from "ioredis";

let client = null;
let connected = false;

const init = () => {
  if (client) return;
  try {
    client = new Redis({
      host:           process.env.REDIS_HOST || "127.0.0.1",
      port:           parseInt(process.env.REDIS_PORT || "6379"),
      password:       process.env.REDIS_PASSWORD || undefined,
      lazyConnect:    true,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: false,
    });

    client.on("connect", () => {
      connected = true;
      console.log("✅ Redis connected");
    });

    client.on("error", (err) => {
      if (connected) console.warn("⚠️  Redis error (non-fatal):", err.message);
      connected = false;
    });

    client.connect().catch(() => {
      console.warn("⚠️  Redis not available — caching disabled (app works normally)");
    });
  } catch {
    console.warn("⚠️  Redis init failed — caching disabled");
  }
};

export const cache = {
  /**
   * Get a cached value. Returns null if not found or Redis unavailable.
   */
  get: async (key) => {
    if (!connected || !client) return null;
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set a value with TTL in seconds.
   */
  set: async (key, value, ttlSeconds = 300) => {
    if (!connected || !client) return;
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // silently fail
    }
  },

  /**
   * Delete a key (use when data changes).
   */
  del: async (...keys) => {
    if (!connected || !client) return;
    try {
      await client.del(...keys);
    } catch {
      // silently fail
    }
  },

  /**
   * Delete all keys matching a pattern.
   */
  delPattern: async (pattern) => {
    if (!connected || !client) return;
    try {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(...keys);
    } catch {
      // silently fail
    }
  },

  isConnected: () => connected,
};

// TTL constants (seconds)
export const TTL = {
  RESEARCH_STATS:   60 * 60,       // 1 hour
  RESEARCH_PREVIEW: 60 * 60 * 6,   // 6 hours
  DOCTOR_LIST:      60 * 30,        // 30 minutes
  PREDICTION_HIST:  60 * 2,         // 2 minutes
  VERIFY:           60 * 5,         // 5 minutes
};

init();
