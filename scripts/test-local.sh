#!/bin/bash

echo "🚀 Starting iFu Labs local testing..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Start PostgreSQL and Redis
echo "📦 Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are up
if docker-compose ps | grep -q "Up"; then
  echo "✅ Services are running"
else
  echo "❌ Services failed to start"
  docker-compose logs
  exit 1
fi

# Generate migrations
echo "📝 Generating database migrations..."
npx drizzle-kit generate:pg

# Run migrations
echo "🔄 Running database migrations..."
npm run migrate

# Seed the database
echo "🌱 Seeding database..."
node src/db/seed.js

echo ""
echo "✅ Local environment ready!"
echo ""
echo "To start the API server:"
echo "  npm run dev"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
