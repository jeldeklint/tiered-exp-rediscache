# tiered-exp-rediscache
give exp redis cache LRU and invalidation. in-mem ruls.

Silly benchmark scewed against read heavy with few updates

```console
➜  tiered-exp-rediscache git:(main) node benchmark.js

=== Benchmark: RedisCache only ===
Ops: 204403, Avg Latency: 1.223 ms
P50: 1.150 ms, P95: 1.801 ms, P99: 2.670 ms

=== Benchmark: TieredCache (in-mem + Redis) ===
Ops: 1316833, Avg Latency: 0.190 ms
P50: 0.013 ms, P95: 1.004 ms, P99: 1.260 ms
```