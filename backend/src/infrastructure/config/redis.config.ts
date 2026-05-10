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

function normalizeString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (
    normalized === '' ||
    normalized.toLowerCase() === 'undefined' ||
    normalized.toLowerCase() === 'null'
  ) {
    return undefined;
  }

  return normalized;
}

function parseNumber(value: string | undefined, fallback: number): number {
  const normalized = normalizeString(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 65536
    ? parsed
    : fallback;
}

export function getRedisConfig(): RedisConfig {
  const redisUrl = getRedisUrl();
  const envHost =
    normalizeString(process.env.REDIS_HOST) ??
    normalizeString(process.env.REDISHOST);
  const envPort =
    normalizeString(process.env.REDIS_PORT) ??
    normalizeString(process.env.REDISPORT);
  const host = envHost ?? redisUrl?.hostname ?? '127.0.0.1';
  const port = parseNumber(
    envPort ?? redisUrl?.port,
    6379,
  );
  const password =
    normalizeString(process.env.REDIS_PASSWORD) ??
    normalizeString(process.env.REDISPASSWORD) ??
    (redisUrl?.password ? decodeURIComponent(redisUrl.password) : undefined);
  const db = parseNumber(
    normalizeString(process.env.REDIS_DB) ??
      normalizeString(process.env.REDISDATABASE) ??
      (redisUrl?.pathname && redisUrl.pathname !== '/'
        ? redisUrl.pathname.replace(/^\//, '')
        : undefined),
    0,
  );
  const enabled = Boolean(redisUrl || envHost);

  return {
    enabled,
    host,
    port,
    password,
    db,
    instanceId: process.env.INSTANCE_ID ?? `instance-${process.pid}`,
  };
}
