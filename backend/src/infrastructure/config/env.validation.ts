export interface ValidatedEnv {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
}

function setDerivedDatabaseUrl(env: NodeJS.ProcessEnv): void {
  if (env.DATABASE_URL && String(env.DATABASE_URL).trim() !== '') {
    return;
  }

  const directUrl =
    env.DATABASE_PUBLIC_URL ??
    env.POSTGRES_URL ??
    env.POSTGRESQL_URL ??
    env.PGURL;

  if (directUrl && String(directUrl).trim() !== '') {
    env.DATABASE_URL = directUrl;
    return;
  }

  const host = env.PGHOST ?? env.POSTGRES_HOST;
  const port = env.PGPORT ?? env.POSTGRES_PORT ?? '5432';
  const database = env.PGDATABASE ?? env.POSTGRES_DB;
  const user = env.PGUSER ?? env.POSTGRES_USER;
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD;

  if (host && database && user && password) {
    env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
}

function setDerivedRedisConfig(env: NodeJS.ProcessEnv): void {
  if (
    env.REDIS_HOST &&
    String(env.REDIS_HOST).trim() !== '' &&
    env.REDIS_PORT &&
    String(env.REDIS_PORT).trim() !== ''
  ) {
    return;
  }

  const redisUrl =
    env.REDIS_URL ??
    env.REDIS_PUBLIC_URL ??
    env.REDIS_PRIVATE_URL;

  if (redisUrl && String(redisUrl).trim() !== '') {
    try {
      const parsed = new URL(redisUrl);
      env.REDIS_HOST = env.REDIS_HOST ?? parsed.hostname;
      env.REDIS_PORT = env.REDIS_PORT ?? (parsed.port || '6379');
      env.REDIS_PASSWORD =
        env.REDIS_PASSWORD ?? decodeURIComponent(parsed.password || '');
      env.REDIS_DB =
        env.REDIS_DB ??
        (parsed.pathname && parsed.pathname !== '/'
          ? parsed.pathname.replace(/^\//, '')
          : '0');
      return;
    } catch {
      // Invalid URL; fall back to host/port-style Railway variables below.
    }
  }

  env.REDIS_HOST = env.REDIS_HOST ?? env.REDISHOST;
  env.REDIS_PORT = env.REDIS_PORT ?? env.REDISPORT;
  env.REDIS_PASSWORD = env.REDIS_PASSWORD ?? env.REDISPASSWORD;
  env.REDIS_DB = env.REDIS_DB ?? env.REDISDATABASE ?? '0';
}

export function validateEnv(env: NodeJS.ProcessEnv): ValidatedEnv {
  setDerivedDatabaseUrl(env);
  setDerivedRedisConfig(env);

  const requiredKeys: Array<keyof ValidatedEnv> = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  for (const key of requiredKeys) {
    if (!env[key] || String(env[key]).trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    DATABASE_URL: env.DATABASE_URL as string,
    JWT_SECRET: env.JWT_SECRET as string,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET as string,
    REDIS_HOST: env.REDIS_HOST,
    REDIS_PORT: env.REDIS_PORT,
  };
}
