#!/bin/bash

# iFu Labs - Stop all services

echo "🛑 Stopping iFu Labs services..."
echo ""

# Kill all node processes running Next.js or Fastify
echo "Stopping Node.js processes..."
pkill -f "next dev"
pkill -f "node src/index.js"

# Stop Docker services
echo "Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped!"
