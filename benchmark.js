import Redis from "ioredis";
import AsyncCache from "exp-asynccache";
import RedisCache from "exp-rediscache";
import { TieredCache } from "./index.js";
import { performance } from "perf_hooks";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runBenchmark(cache, label, { duration = 5000, concurrency = 10, keyspace = 100 }) {
  console.log(`\n=== Benchmark: ${label} ===`);
  let ops = 0;
  let latencies = [];

  let stop = false;
  setTimeout(() => stop = true, duration);

  async function worker(id) {
    while (!stop) {
      const key = "k" + Math.floor(Math.random() * keyspace);
      const action = Math.random();

      const start = performance.now();
      if (action < 0.995) {
        // 99.5% GET
        await cache.get(key);
      } else if (action < 0.999) {
        // 0.4% SET
        await cache.set(key, "val" + id);
      } else {
        // 0.1% DEL
        await cache.del(key);
      }
      const end = performance.now();

      ops++;
      latencies.push(end - start);
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(i));
  }
  await Promise.all(workers);

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  latencies.sort((a, b) => a - b);

  function percentile(p) {
    return latencies[Math.floor(p * latencies.length)];
  }

  console.log(`Ops: ${ops}, Avg Latency: ${avg.toFixed(3)} ms`);
  console.log(`P50: ${percentile(0.5).toFixed(3)} ms, P95: ${percentile(0.95).toFixed(3)} ms, P99: ${percentile(0.99).toFixed(3)} ms`);
}

async function main() {
  const redis = new Redis();

  await redis.flushdb();

  const redisCache = new AsyncCache(new RedisCache(redis));
  const tieredCache = new TieredCache(
    redis,
    new AsyncCache(), // tier1
    new AsyncCache(new RedisCache(redis))
  );

  // Pre-fill keys
  for (let i = 0; i < 1000; i++) {
    await redisCache.set("k" + i, "init");
  }

  await runBenchmark(redisCache, "RedisCache only", { duration:   5000, concurrency: 50, keyspace: 50 });
  await runBenchmark(tieredCache, "TieredCache (in-mem + Redis)", { duration: 5000, concurrency: 50, keyspace: 50 });

  await redis.quit();
  await tieredCache.close();
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});