# Docker Setup Guide

This guide covers running the Public Speaking Platform using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Commands](#development-commands)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Docker Architecture](#docker-architecture)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Backup and Restore](#backup-and-restore)
- [Performance Tuning](#performance-tuning)
- [Security Considerations](#security-considerations)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- 10GB of free disk space

### Installing Docker

**Windows/macOS:**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

## Quick Start

### Development Environment

1. **Clone and setup:**
```bash
git clone <repository-url>
cd public-speaking-platform
cp .env.example .env
```

2. **Configure environment variables:**
Edit `.env` and set required values (see [Environment Variables](#environment-variables))

3. **Start all services:**
```bash
docker compose up -d
```

4. **Initialize the database:**
```bash
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

5. **Access the application:**
- Application: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Production Environment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Development Commands

### Container Management

**Start services:**
```bash
docker compose up -d
```

**Stop services:**
```bash
docker compose down
```

**Restart services:**
```bash
docker compose restart
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis
```

**Check service status:**
```bash
docker compose ps
```

### Application Commands

**Run database migrations:**
```bash
docker compose exec app npm run db:migrate
```

**Seed the database:**
```bash
docker compose exec app npm run db:seed
```

**Run tests:**
```bash
docker compose exec app npm test
```

**Access application shell:**
```bash
docker compose exec app sh
```

**Access database shell:**
```bash
docker compose exec postgres psql -U postgres -d speaking_platform
```

**Access Redis CLI:**
```bash
docker compose exec redis redis-cli
```

### Rebuilding Services

**Rebuild after code changes:**
```bash
docker compose build app
docker compose up -d app
```

**Rebuild all services:**
```bash
docker compose build
docker compose up -d
```

**Force rebuild (no cache):**
```bash
docker compose build --no-cache
docker compose up -d
```

## Production Deployment

### Using Production Compose File

The production configuration includes:
- Optimized build settings
- Resource limits
- Production-grade health checks
- Restart policies
- Security hardening

**Deploy:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Using Standalone Dockerfile

**Build production image:**
```bash
docker build -f Dockerfile.prod -t speaking-platform:latest .
```

**Run with custom configuration:**
```bash
docker run -d \
  --name speaking-platform \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="your-secret" \
  speaking-platform:latest
```

### Docker Swarm Deployment

**Initialize Swarm:**
```bash
docker swarm init
```

**Deploy stack:**
```bash
docker stack deploy -c docker-compose.prod.yml speaking-platform
```

**Scale services:**
```bash
docker service scale speaking-platform_app=3
```

**Check service status:**
```bash
docker service ls
docker service ps speaking-platform_app
```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests:
- `deployment.yaml` - Application deployment
- `service.yaml` - Service definitions
- `ingress.yaml` - Ingress configuration
- `configmap.yaml` - Configuration
- `secrets.yaml` - Sensitive data (template)

**Deploy to Kubernetes:**
```bash
kubectl apply -f k8s/
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secure-random-string` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth secret | `your-nextauth-secret` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |
| `AWS_REGION` | AWS region for S3 | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `S3_BUCKET_NAME` | S3 bucket for uploads | - |
| `ANTHROPIC_API_KEY` | Claude API key | - |
| `REDIS_TTL` | Cache TTL in seconds | `3600` |

### Setting Environment Variables

**Development (.env file):**
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/speaking_platform
REDIS_URL=redis://redis:6379
JWT_SECRET=dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret
```

**Production (Docker secrets):**
```bash
echo "production-jwt-secret" | docker secret create jwt_secret -
docker service update --secret-add jwt_secret speaking-platform_app
```

## Docker Architecture

### Service Overview

```
┌─────────────────────────────────────────┐
│           Load Balancer/Proxy           │
│              (nginx/Traefik)            │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼────┐            ┌─────▼───┐
│  App   │            │   App   │
│  (N+)  │            │  (N+)   │
└───┬────┘            └─────┬───┘
    │                       │
    └───────────┬───────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼──────┐        ┌───────▼──┐
│PostgreSQL│        │  Redis   │
│          │        │          │
└──────────┘        └──────────┘
```

### Container Specifications

**Application Container:**
- Base: `node:20-alpine`
- Exposed Port: 3000
- Health Check: HTTP GET /api/health
- Restart Policy: unless-stopped

**PostgreSQL Container:**
- Base: `postgres:16-alpine`
- Exposed Port: 5432
- Volume: `postgres_data:/var/lib/postgresql/data`
- Health Check: `pg_isready`

**Redis Container:**
- Base: `redis:7-alpine`
- Exposed Port: 6379
- Volume: `redis_data:/data`
- Health Check: `redis-cli ping`

### Network Configuration

All services communicate via the `app-network` bridge network:
- Internal DNS resolution
- Isolated from external networks
- Only app container exposes ports to host

### Volume Management

**Named volumes:**
- `postgres_data` - Database persistence
- `redis_data` - Cache persistence

**Backup volumes:**
```bash
docker volume ls
docker volume inspect public-speaking-platform_postgres_data
```

## Health Checks

### Application Health Endpoint

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Monitoring Health

**Check container health:**
```bash
docker compose ps
```

**Manual health check:**
```bash
curl http://localhost:3000/api/health
```

**View health logs:**
```bash
docker inspect --format='{{json .State.Health}}' <container-id> | jq
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change port in .env
PORT=3001
```

#### 2. Database Connection Failed

**Error:** `Error: connect ECONNREFUSED`

**Solution:**
```bash
# Check if postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres

# Verify DATABASE_URL matches service name
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/speaking_platform
```

#### 3. Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory limit in Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Or in docker-compose.yml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

#### 4. Slow Build Times

**Solution:**
```bash
# Use BuildKit
export DOCKER_BUILDKIT=1

# Clean build cache
docker builder prune

# Use multi-stage builds (already configured)
```

#### 5. Container Keeps Restarting

**Diagnosis:**
```bash
# Check logs
docker compose logs app

# Check health status
docker compose ps

# Inspect container
docker inspect <container-id>
```

### Debugging Commands

**Interactive debugging:**
```bash
# Run container with shell
docker compose run --rm app sh

# Attach to running container
docker compose exec app sh

# Run specific command
docker compose exec app npm run db:migrate
```

**Network debugging:**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect public-speaking-platform_app-network

# Test connectivity
docker compose exec app ping postgres
docker compose exec app nc -zv postgres 5432
```

**Volume debugging:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect public-speaking-platform_postgres_data

# Browse volume contents
docker run --rm -v public-speaking-platform_postgres_data:/data alpine ls -la /data
```

## Backup and Restore

### Database Backup

**Create backup:**
```bash
# Using docker exec
docker compose exec postgres pg_dump -U postgres speaking_platform > backup.sql

# Using docker compose
docker compose exec -T postgres pg_dump -U postgres speaking_platform > backup.sql

# Compressed backup
docker compose exec postgres pg_dump -U postgres speaking_platform | gzip > backup.sql.gz
```

**Automated backups:**
```bash
# Add to crontab
0 2 * * * cd /path/to/project && docker compose exec -T postgres pg_dump -U postgres speaking_platform | gzip > backups/backup-$(date +\%Y\%m\%d).sql.gz
```

### Database Restore

**Restore from backup:**
```bash
# Uncompressed
docker compose exec -T postgres psql -U postgres speaking_platform < backup.sql

# Compressed
gunzip < backup.sql.gz | docker compose exec -T postgres psql -U postgres speaking_platform
```

**Complete restore process:**
```bash
# 1. Stop application
docker compose stop app

# 2. Drop and recreate database
docker compose exec postgres psql -U postgres -c "DROP DATABASE speaking_platform;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE speaking_platform;"

# 3. Restore backup
docker compose exec -T postgres psql -U postgres speaking_platform < backup.sql

# 4. Start application
docker compose start app
```

### Volume Backup

**Backup volume:**
```bash
docker run --rm \
  -v public-speaking-platform_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data
```

**Restore volume:**
```bash
docker run --rm \
  -v public-speaking-platform_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres-data-20240101.tar.gz -C /
```

## Performance Tuning

### Application Optimization

**Memory settings:**
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

**Worker processes:**
```yaml
deploy:
  replicas: 3
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Database Optimization

**PostgreSQL tuning:**
```yaml
postgres:
  command:
    - postgres
    - -c
    - shared_buffers=256MB
    - -c
    - max_connections=200
    - -c
    - effective_cache_size=1GB
```

**Connection pooling:**
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/speaking_platform?pool_timeout=0&connection_limit=20
```

### Redis Optimization

**Memory settings:**
```yaml
redis:
  command:
    - redis-server
    - --maxmemory 512mb
    - --maxmemory-policy allkeys-lru
```

### Build Optimization

**Layer caching:**
```dockerfile
# Copy package files first
COPY package*.json ./
RUN npm ci

# Then copy source code
COPY . .
```

**BuildKit features:**
```dockerfile
# syntax=docker/dockerfile:1.4
RUN --mount=type=cache,target=/root/.npm npm ci
```

## Security Considerations

### Image Security

**Use specific versions:**
```dockerfile
FROM node:20.11-alpine3.19
```

**Run as non-root:**
```dockerfile
USER node
```

**Scan for vulnerabilities:**
```bash
docker scan speaking-platform:latest
```

### Network Security

**Internal communication only:**
```yaml
networks:
  app-network:
    internal: true
```

**Expose only necessary ports:**
```yaml
ports:
  - "127.0.0.1:3000:3000"  # Bind to localhost only
```

### Secrets Management

**Use Docker secrets (Swarm):**
```bash
echo "secret-value" | docker secret create jwt_secret -
```

**Use environment files:**
```bash
# .env.production (gitignored)
docker compose --env-file .env.production up -d
```

**Never commit secrets:**
```bash
# .gitignore
.env
.env.local
.env.*.local
```

### Runtime Security

**Read-only root filesystem:**
```yaml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
```

**Resource limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
      pids: 100
```

**Drop capabilities:**
```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

### Updates and Patching

**Regular updates:**
```bash
# Update base images
docker compose pull
docker compose up -d

# Update dependencies
docker compose exec app npm update
docker compose restart app
```

**Security scanning:**
```bash
# Scan images
docker scout cves speaking-platform:latest

# Scan dependencies
docker compose exec app npm audit
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)
- [Redis Docker Guide](https://hub.docker.com/_/redis)

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review Docker logs: `docker compose logs`
- Open an issue on GitHub
- Contact the development team
