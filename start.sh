#!/bin/bash

# Run database migrations
echo "🚀 Running database migrations..."
alembic upgrade head

# Start the application
echo "📡 Starting application..."
exec uvicorn step6_api_gateway.main:app --host 0.0.0.0 --port 7860
