import Redis from "ioredis";
import AsyncCache from "exp-asynccache";
import RedisCache from "exp-rediscache";

import { TieredCache } from "../index.js";

describe("TieredCache", function () {
  this.timeout(5000);

  let redis;
  let tiered;

  before(async () => {
    redis = new Redis();

    // Explicitly configure Redis for keyspace notifications
    await redis.config("SET", "notify-keyspace-events", "Exg");
  });

  after(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();

    const tier1 = new AsyncCache();
    const tier2 = new AsyncCache(new RedisCache(redis));

    tiered = new TieredCache(redis, tier1, tier2, { db: 0 });
  });

  afterEach(async () => {
    await tiered.reset();
    await tiered.close();
  });

  it("sets and gets values through tier1 and tier2", async () => {
    await tiered.set("foo", "bar");

    const val1 = await tiered.get("foo");
    expect(val1).to.equal("bar");

    await tiered.tier1.reset();
    const val2 = await tiered.get("foo");
    expect(val2).to.equal("bar");
  });

  it("invalidates tier1 on Redis DEL", async () => {
    await tiered.set("a", "1");
    const val1 = await tiered.get("a");
    expect(val1).to.equal("1");

    await redis.del("a");
    // Wait for pubsub to propagate
    await new Promise((r) => setTimeout(r, 50));

    const val2 = await tiered.get("a");
    expect(val2).to.be.undefined;
  });

  it("invalidates tier1 on Redis EXPIRE", async () => {
    await redis.set("ttlkey", JSON.stringify("xyz"), "PX", 100);

    const val1 = await tiered.get("ttlkey");
    expect(val1).to.equal("xyz");

    // Wait for expiry + pubsub
    await new Promise((r) => setTimeout(r, 200));

    const val2 = await tiered.get("ttlkey");
    expect(val2).to.be.undefined;
  });

  it("checks tier existence with has()", async () => {
    await tiered.set("exists", "yes");

    expect(await tiered.has("exists")).to.be.true;
    expect(await tiered.has("missing")).to.be.false;

    await redis.del("exists");
    await new Promise((r) => setTimeout(r, 50));
    expect(await tiered.has("exists")).to.be.false;
  });

  it("resets both tiers", async () => {
    await tiered.set("x", "1");
    await tiered.reset();

    const val = await tiered.get("x");
    expect(val).to.be.undefined;
  });
});
