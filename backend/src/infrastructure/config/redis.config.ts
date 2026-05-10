import { RedisConfig } from '../redis/redis.constants';

function getRedisUrl(): URL | null {
  const rawUrl =
    process.env.REDIS_URL ??
    process.env.REDIS_PUBLIC_URL ??
    process.env.REDIS_PRIVATE_URL;

  if (!rawUrl || rawUrl.trim() === '') {
    return null;
  }

  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 65536
    ? parsed
    : fallback;
}

export function getRedisConfig(): RedisConfig {
  const redisUrl = getRedisUrl();
  const host =
    process.env.REDIS_HOST?.trim() ||
    process.env.REDISHOST?.trim() ||
    redisUrl?.hostname ||
    '127.0.0.1';
  const port = parseNumber(
    process.env.REDIS_PORT ??
      process.env.REDISPORT ??
      redisUrl?.port,
    6379,
  );
  const password =
    process.env.REDIS_PASSWORD ??
    process.env.REDISPASSWORD ??
    (redisUrl?.password ? decodeURIComponent(redisUrl.password) : undefined);
  const db = parseNumber(
    process.env.REDIS_DB ??
      process.env.REDISDATABASE ??
      (redisUrl?.pathname && redisUrl.pathname !== '/'
        ? redisUrl.pathname.replace(/^\//, '')
        : undefined),
    0,
  );

  return {
    host,
    port,
    password,
    db,
    instanceId: process.env.INSTANCE_ID ?? `instance-${process.pid}`,
  };
}
