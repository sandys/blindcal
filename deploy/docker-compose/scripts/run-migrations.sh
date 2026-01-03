#!/bin/bash
# ===========================================
# Run BlindCal Migrations
# ===========================================

set -e

MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"

echo "Running BlindCal migrations..."

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Migrations directory not found: $MIGRATIONS_DIR"
    exit 0
fi

# Run each migration file in order
for migration in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    echo "Applying migration: $(basename $migration)"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done

echo "All migrations applied successfully!"
