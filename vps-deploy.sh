#!/bin/bash

# VPS Deployment Script
# This script uses your GitHub token for authenticated clone

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Zyra v2.0 - VPS Deployment           ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# GitHub token (you'll enter this during deployment)
read -sp "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ GitHub token is required${NC}"
    exit 1
fi

# Clone repository with token
echo -e "${GREEN}📦 Cloning repository...${NC}"
git clone https://${GITHUB_TOKEN}@github.com/ginkelsoft-development/zyra-v2.git
cd zyra-v2

# Run complete setup
echo -e "${GREEN}🚀 Starting complete setup...${NC}"
sudo bash complete-setup.sh

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Revoke your GitHub token if you don't need it anymore${NC}"
echo -e "${YELLOW}    Visit: https://github.com/settings/tokens${NC}"
