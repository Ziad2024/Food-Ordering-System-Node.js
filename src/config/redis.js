import Redis from "ioredis";

// Use REDIS_URL (Upstash/Railway) if set, otherwise fall back to local
const REDIS_URL =
  process.env.REDIS_URL ||
  "rediss://default:gQAAAAAAARhWAAIgcDIwOWM2MWI4YTI1Yzg0OTE0OTFiMGRmN2RiNjdlMjcyYQ@crisp-starfish-71766.upstash.io:6379";

// Parse the Redis URL into ioredis options so BullMQ can create its own connections
function parseRedisUrl(url) {
  const parsed = new URL(url);
  const config = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    maxRetriesPerRequest: null, // Required for BullMQ
  };
  if (parsed.password) {
    config.password = decodeURIComponent(parsed.password);
  }
  // rediss:// means TLS — required for Upstash
  if (parsed.protocol === "rediss:") {
    config.tls = {};
  }
  return config;
}

// redisConfig is used by BullMQ Queues & Workers (they create their own connections)
const redisConfig = parseRedisUrl(REDIS_URL);

// redisClient is the shared client used for caching / session checks
const redisClient = new Redis(redisConfig);

redisClient.on("connect", () => {
  console.log("Redis connected successfully to Upstash");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

export { redisClient, redisConfig };
export default redisClient;
