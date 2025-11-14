#!/bin/bash

# Server-side deployment script
# Run this manually on your server or via GitHub Actions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Zyra v2.0 - Server Deployment        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Configuration
APP_DIR="/var/www/zyra-v2"
APP_NAME="zyra-v2"
BRANCH="main"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Consider using a service account.${NC}"
fi

# Navigate to app directory
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
else
    echo -e "${RED}❌ Application directory not found: $APP_DIR${NC}"
    echo -e "${YELLOW}Please update APP_DIR in this script or create the directory${NC}"
    exit 1
fi

echo -e "${GREEN}📂 Application directory: $APP_DIR${NC}"
echo ""

# Backup current .env file
if [ -f .env ]; then
    echo -e "${BLUE}💾 Backing up .env file...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Pull latest changes
echo -e "${GREEN}📦 Pulling latest changes from GitHub...${NC}"
git fetch origin
git reset --hard origin/$BRANCH
echo ""

# Install dependencies
echo -e "${GREEN}📋 Installing dependencies...${NC}"
npm ci
echo ""

# Build application
echo -e "${GREEN}🏗️  Building application...${NC}"
npm run build
echo ""

# Database migrations
echo -e "${GREEN}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy
npx prisma generate
echo ""

# Restart application
echo -e "${GREEN}🔄 Restarting application...${NC}"

if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Using PM2...${NC}"
    pm2 restart $APP_NAME || {
        echo -e "${YELLOW}Starting new PM2 process...${NC}"
        pm2 start npm --name $APP_NAME -- start
    }
    pm2 save
    pm2 status $APP_NAME
elif systemctl is-active --quiet $APP_NAME; then
    echo -e "${BLUE}Using systemd...${NC}"
    sudo systemctl restart $APP_NAME
    sudo systemctl status $APP_NAME --no-pager
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo -e "${BLUE}Using Docker Compose...${NC}"
    docker-compose restart
    docker-compose ps
else
    echo -e "${RED}❌ Could not detect process manager (PM2/systemd/docker)${NC}"
    echo -e "${YELLOW}Please restart the application manually:${NC}"
    echo -e "${YELLOW}  npm run start${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Your application should now be running with the latest changes${NC}"
