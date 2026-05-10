# Public Speaking Platform

## Docker Setup

### Quick Start with Docker

1. Start the development environment:
   ```bash
   docker-compose up -d
   ```

2. Access the application at http://localhost:3000

3. View logs:
   ```bash
   docker-compose logs -f app
   ```

For detailed Docker instructions, see [docs/DOCKER.md](docs/DOCKER.md).

### Common Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Run tests
docker-compose exec app npm test

# Run Prisma migrations
docker-compose exec app npx prisma migrate dev

# Shell access
docker-compose exec app sh
```

## Local Development (without Docker)

If you prefer to run without Docker, you'll need:
- Node.js 20+
- PostgreSQL 16

Then follow the standard npm setup:
```bash
npm install
npm run dev
```
