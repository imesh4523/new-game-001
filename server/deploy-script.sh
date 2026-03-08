#!/bin/bash
# Deployment script for Digital Ocean servers
# This script will be executed on each Digital Ocean droplet

set -e

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="/var/www/gaming-app"
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"
NODE_VERSION="20"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Installing system dependencies...${NC}"
# Update system packages
sudo apt-get update -qq

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}📦 Installing Node.js ${NODE_VERSION}...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo -e "${BLUE}📁 Creating application directory...${NC}"
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
fi

cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
    echo -e "${BLUE}🔄 Updating existing repository...${NC}"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    echo -e "${BLUE}📥 Cloning repository...${NC}"
    git clone $REPO_URL .
fi

# Install dependencies
echo -e "${BLUE}📦 Installing application dependencies...${NC}"
npm install --production

# Build application if needed
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
    echo -e "${BLUE}🔨 Building application...${NC}"
    npm run build
fi

# Setup environment variables
if [ ! -f ".env" ]; then
    echo -e "${BLUE}⚙️  Creating environment file...${NC}"
    cat > .env << EOL
NODE_ENV=production
PORT=5000
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
EOL
fi

# Stop existing application
echo -e "${BLUE}🛑 Stopping existing application...${NC}"
pm2 stop gaming-app 2>/dev/null || true
pm2 delete gaming-app 2>/dev/null || true

# Start application with PM2
echo -e "${BLUE}▶️  Starting application...${NC}"
pm2 start npm --name "gaming-app" -- start
pm2 save
pm2 startup | tail -n 1 | sudo bash || true

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running on port 5000${NC}"

# Display PM2 status
pm2 status
