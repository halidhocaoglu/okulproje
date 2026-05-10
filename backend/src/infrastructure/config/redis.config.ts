import { RedisConfig } from '../redis/redis.constants';

export function getRedisConfig(): RedisConfig {
  const host = process.env.REDIS_HOST ?? process.env.REDISHOST ?? '127.0.0.1';
  const port = Number(process.env.REDIS_PORT ?? process.env.REDISPORT ?? 6379);
  const password =
    process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? undefined;
  const db = Number(
    process.env.REDIS_DB ?? process.env.REDISDATABASE ?? 0,
  );

  return {
    host,
    port,
    password,
    db,
    instanceId: process.env.INSTANCE_ID ?? `instance-${process.pid}`,
  };
}
