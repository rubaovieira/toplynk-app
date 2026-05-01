#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Running TypeORM migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d ./dist/data-source.js
fi

exec "$@"
