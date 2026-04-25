#!/bin/bash

# Flush Redis cache (production)
# This clears all cached data: AI responses, pricing, FinOps findings, etc.

REDIS_URL="redis://default:Bu10SvWS6vMqL1GEcW8SEvSXzqyYi444@redis-17512.c309.us-east-2-1.ec2.cloud.redislabs.com:17512"

echo "🗑️  Flushing Redis cache..."
echo ""

redis-cli -u "$REDIS_URL" FLUSHALL

if [ $? -eq 0 ]; then
  echo "✅ Redis cache cleared successfully!"
  echo ""
  echo "Cleared:"
  echo "  • AI response cache"
  echo "  • AWS pricing cache"
  echo "  • FinOps findings cache"
  echo "  • BullMQ job queues"
else
  echo "❌ Failed to flush Redis"
  exit 1
fi
