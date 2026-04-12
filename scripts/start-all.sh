#!/bin/bash

# iFu Labs - Start all services
# This script starts the API, Portal, Comply, FinOps, and Website

echo "🚀 Starting iFu Labs services..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Start Docker services
echo "📦 Starting PostgreSQL and Redis..."
docker-compose up -d
sleep 3

# Start API
echo "🔧 Starting API (port 3000)..."
cd "$(dirname "$0")/.."
npm run dev > /dev/null 2>&1 &
API_PID=$!
echo "   API PID: $API_PID"

# Start Portal
echo "🌐 Starting Portal (port 3003)..."
cd portal
npm run dev > /dev/null 2>&1 &
PORTAL_PID=$!
echo "   Portal PID: $PORTAL_PID"
cd ..

# Start Comply
echo "🛡️  Starting Comply (port 3001)..."
cd comply
npm run dev > /dev/null 2>&1 &
COMPLY_PID=$!
echo "   Comply PID: $COMPLY_PID"
cd ..

# Start FinOps
echo "💰 Starting FinOps (port 3002)..."
cd finops
npm run dev > /dev/null 2>&1 &
FINOPS_PID=$!
echo "   FinOps PID: $FINOPS_PID"
cd ..

# Start Website
echo "🌍 Starting Website (port 3004)..."
cd website
npm run dev > /dev/null 2>&1 &
WEBSITE_PID=$!
echo "   Website PID: $WEBSITE_PID"
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Access points:"
echo "   API:     http://localhost:3000"
echo "   Portal:  http://localhost:3003"
echo "   Comply:  http://localhost:3001"
echo "   FinOps:  http://localhost:3002"
echo "   Website: http://localhost:3004"
echo ""
echo "💡 To stop all services, run: ./scripts/stop-all.sh"
echo ""
