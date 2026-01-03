# BlindCal Docker Compose Setup

This directory contains a fully dockerized local development infrastructure for BlindCal, including all Supabase services.

## Services

| Service | Description | Port |
|---------|-------------|------|
| **db** | PostgreSQL 15 database | 55322 |
| **auth** | Supabase Auth (GoTrue) | - |
| **rest** | Supabase REST API (PostgREST) | - |
| **realtime** | Supabase Realtime | - |
| **storage** | Supabase Storage | - |
| **imgproxy** | Image transformation proxy | - |
| **meta** | PostgreSQL Meta API | - |
| **kong** | API Gateway | 8100 (HTTP), 8543 (HTTPS) |
| **studio** | Supabase Studio (Admin UI) | 55323 |
| **inbucket** | Local email testing | 55326 (Web), 2501 (SMTP) |
| **app** | BlindCal Next.js application | 3100 |

## Quick Start

### 1. Start the stack

```bash
cd deploy/docker-compose
docker compose up -d
```

### 2. Wait for services to be healthy

```bash
docker compose ps
```

### 3. Access the services

- **BlindCal App**: http://localhost:3100
- **Supabase API**: http://localhost:8100
- **Supabase Studio**: http://localhost:55323
- **Email Testing (Inbucket)**: http://localhost:55326

## Environment Variables

The default configuration is in `.env`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | postgres | Database password |
| `JWT_SECRET` | super-secret-jwt-token... | JWT signing secret |
| `ANON_KEY` | eyJ... | Supabase anonymous key |
| `SERVICE_ROLE_KEY` | eyJ... | Supabase service role key |
| `APP_PORT` | 3100 | Next.js app port |
| `KONG_HTTP_PORT` | 8100 | Supabase API port |
| `STUDIO_PORT` | 55323 | Supabase Studio port |

## Useful Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f app
docker compose logs -f db

# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v

# Rebuild the app
docker compose build app
docker compose up -d app

# Access database directly
docker compose exec db psql -U postgres

# View service status
docker compose ps
```

## Database Access

Connect to PostgreSQL:
- **Host**: localhost
- **Port**: 55322
- **User**: postgres
- **Password**: postgres
- **Database**: postgres

Or use the connection string:
```
postgresql://postgres:postgres@localhost:55322/postgres
```

## Email Testing

All emails are captured by Inbucket. Access the web UI at http://localhost:55326 to view sent emails (password resets, confirmations, etc).

## Troubleshooting

### Services not starting

Check if ports are already in use:
```bash
lsof -i :3100
lsof -i :8100
lsof -i :55322
```

### Database connection issues

Ensure the database is healthy:
```bash
docker compose exec db pg_isready -U postgres
```

### Reset everything

```bash
docker compose down -v
rm -rf volumes/db/data/*
docker compose up -d
```

## Production Considerations

This setup is for **local development only**. For production:

1. Change all secrets (`JWT_SECRET`, passwords, keys)
2. Use proper SSL/TLS certificates
3. Configure proper backup strategies
4. Use managed services (Supabase Cloud, AWS RDS, etc.)
5. Enable proper logging and monitoring
