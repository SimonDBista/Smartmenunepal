#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  Deploying SmartMenu Nepal Updates to VPS"
echo "=========================================="

# Ensure uploads directory exists with correct permissions
mkdir -p public/uploads
chmod -R 775 public/uploads || true

# 1. Docker Compose deployment (if docker-compose is installed)
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo ">> Detected Docker Compose setup."
    echo ">> Building and restarting web container..."
    docker-compose up -d --build web
    echo ">> Docker deployment successful!"
    exit 0
fi

# 2. PM2 deployment (if PM2 is used on the VPS)
if command -v pm2 &> /dev/null; then
    echo ">> Detected PM2 process manager."
    npm install
    npx prisma generate
    npm run build
    pm2 restart advanced-restro || pm2 restart all || pm2 start ecosystem.config.js
    echo ">> PM2 deployment successful!"
    exit 0
fi

# 3. Direct Node.js rebuild
echo ">> Running standard build..."
npm install
npx prisma generate
npm run build
echo ">> Build complete! Run 'node server.js' or restart your service."
