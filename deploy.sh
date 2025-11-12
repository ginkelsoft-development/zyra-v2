#!/bin/bash

# Insurance Orchestrator Deployment Script voor Ubuntu 24
# Dit script automatiseert de deployment op een Ubuntu 24 VPS

set -e  # Exit bij errors

echo "=================================================="
echo "Insurance Orchestrator Deployment Script"
echo "=================================================="
echo ""

# Check of script als root draait
if [ "$EUID" -ne 0 ]; then
    echo "Error: Dit script moet als root draaien (gebruik sudo)"
    exit 1
fi

# Variabelen
APP_DIR="/opt/insurance-orchestrator"
APP_USER="orchestrator"
DB_NAME="zyra_orchestrator"
DB_USER="zyra_user"

echo "Stap 1: Systeem updates..."
apt update
apt upgrade -y

echo ""
echo "Stap 2: Installeer Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "Node.js geïnstalleerd: $(node --version)"
else
    echo "Node.js is al geïnstalleerd: $(node --version)"
fi

echo ""
echo "Stap 3: Installeer MySQL..."
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    echo "MySQL geïnstalleerd"
else
    echo "MySQL is al geïnstalleerd"
fi

echo ""
echo "Stap 4: Installeer Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "Nginx geïnstalleerd"
else
    echo "Nginx is al geïnstalleerd"
fi

echo ""
echo "Stap 5: Installeer PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo "PM2 geïnstalleerd"
else
    echo "PM2 is al geïnstalleerd"
fi

echo ""
echo "Stap 6: Installeer GitHub CLI..."
if ! command -v gh &> /dev/null; then
    mkdir -p -m 755 /etc/apt/keyrings
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    apt update
    apt install -y gh
    echo "GitHub CLI geïnstalleerd"
else
    echo "GitHub CLI is al geïnstalleerd"
fi

echo ""
echo "Stap 7: Maak applicatie gebruiker..."
if ! id "$APP_USER" &>/dev/null; then
    adduser --system --group --home $APP_DIR $APP_USER
    echo "Gebruiker $APP_USER aangemaakt"
else
    echo "Gebruiker $APP_USER bestaat al"
fi

echo ""
echo "Stap 8: Setup database..."
echo "BELANGRIJK: Je moet nu de database configureren!"
echo ""
echo "Voer het volgende uit in MySQL:"
echo "  CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY 'JouwSterkWachtwoord123!';"
echo "  GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
echo "  FLUSH PRIVILEGES;"
echo ""
read -p "Druk op Enter als je de database hebt geconfigureerd..."

echo ""
echo "Stap 9: Setup applicatie directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/.claude/workflows
chown -R $APP_USER:$APP_USER $APP_DIR

echo ""
echo "Stap 10: Kopieer applicatie bestanden..."
echo "De applicatie bestanden moeten naar $APP_DIR gekopieerd worden"
echo "Gebruik rsync of scp om de bestanden te uploaden"
echo ""
read -p "Druk op Enter als je de applicatie bestanden hebt geüpload..."

echo ""
echo "Stap 11: Installeer dependencies..."
cd $APP_DIR
sudo -u $APP_USER npm install

echo ""
echo "Stap 12: Configureer environment variabelen..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Maak .env bestand aan..."
    read -p "Database wachtwoord: " DB_PASSWORD
    sudo -u $APP_USER cat > $APP_DIR/.env << EOF
DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@localhost:3306/$DB_NAME"
NODE_ENV=production
EOF
    echo ".env bestand aangemaakt"
else
    echo ".env bestaat al, wordt overgeslagen"
fi

echo ""
echo "Stap 13: Setup Prisma..."
cd $APP_DIR
sudo -u $APP_USER npx prisma generate
sudo -u $APP_USER npx prisma db push

echo ""
echo "Stap 14: Build applicatie..."
cd $APP_DIR
sudo -u $APP_USER npm run build

echo ""
echo "Stap 15: Setup PM2..."
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    cd $APP_DIR
    sudo -u $APP_USER pm2 delete insurance-orchestrator 2>/dev/null || true
    sudo -u $APP_USER pm2 start ecosystem.config.js
    sudo -u $APP_USER pm2 save

    # Setup PM2 startup
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp $APP_DIR

    echo "PM2 geconfigureerd"
else
    echo "ecosystem.config.js niet gevonden, PM2 setup overgeslagen"
fi

echo ""
echo "Stap 16: Configureer Nginx..."
if [ -f "$APP_DIR/nginx.conf" ]; then
    cp $APP_DIR/nginx.conf /etc/nginx/sites-available/insurance-orchestrator
    ln -sf /etc/nginx/sites-available/insurance-orchestrator /etc/nginx/sites-enabled/

    # Test configuratie
    nginx -t

    # Herstart Nginx
    systemctl restart nginx

    echo "Nginx geconfigureerd"
else
    echo "nginx.conf niet gevonden, Nginx setup overgeslagen"
fi

echo ""
echo "Stap 17: Configureer Firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "=================================================="
echo "Deployment Voltooid!"
echo "=================================================="
echo ""
echo "De applicatie zou nu bereikbaar moeten zijn via:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Nuttige commando's:"
echo "  sudo -u $APP_USER pm2 status          # Status bekijken"
echo "  sudo -u $APP_USER pm2 logs            # Logs bekijken"
echo "  sudo -u $APP_USER pm2 restart all     # Herstarten"
echo ""
echo "Voor SSL certificaat (Let's Encrypt):"
echo "  apt install certbot python3-certbot-nginx"
echo "  certbot --nginx -d jouw-domein.nl"
echo ""
echo "Vergeet niet om GitHub CLI te authenticeren:"
echo "  sudo -u $APP_USER gh auth login"
echo ""
