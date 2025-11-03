#!/bin/bash

# Wait for the database to be ready
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
python3 -m alembic upgrade head

# Start the application
echo "Starting the application..."
exec uvicorn api_gateway.main:app --host 0.0.0.0 --port 8000 --reload 