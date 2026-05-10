#!/usr/bin/env sh
set -eu

resolve_postgres_host() {
  if [ -n "${POSTGRES_HOST:-}" ]; then
    printf '%s' "${POSTGRES_HOST}"
    return
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['DATABASE_URL']).hostname or 'postgres')"
    return
  fi

  printf '%s' "postgres"
}

resolve_postgres_port() {
  if [ -n "${POSTGRES_PORT:-}" ]; then
    printf '%s' "${POSTGRES_PORT}"
    return
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['DATABASE_URL']).port or 5432)"
    return
  fi

  printf '%s' "5432"
}

wait_for_host_port() {
  host="$1"
  port="$2"
  name="$3"

  echo "Waiting for ${name} at ${host}:${port}..."
  until pg_isready -h "$host" -p "$port" >/dev/null 2>&1 || nc -z "$host" "$port"; do
    sleep 2
  done
  echo "${name} is available."
}

wait_for_host_port "$(resolve_postgres_host)" "$(resolve_postgres_port)" "PostgreSQL"

if [ -n "${REDIS_HOST:-}" ]; then
  wait_for_host_port "${REDIS_HOST}" "${REDIS_PORT:-6379}" "Redis"
else
  echo "REDIS_HOST is not set, skipping Redis availability check."
fi
