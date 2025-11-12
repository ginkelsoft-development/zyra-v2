#!/bin/bash

# Complete Setup Script voor Insurance Orchestrator (Zyra v2)
# Dit script combineert CLI tools, infrastructure deployment, en service configuratie

set -e

# Kleuren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Variabelen
APP_DIR="/opt/insurance-orchestrator"
APP_USER="orchestrator"
DB_NAME="zyra_orchestrator"
DB_USER="zyra_user"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_banner() {
    clear
    echo -e "${MAGENTA}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║          🚀 ZYRA v2 - Complete Setup Wizard 🚀              ║"
    echo "║                                                              ║"
    echo "║              Insurance Orchestrator Platform                 ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Dit script moet als root draaien (gebruik sudo)"
        exit 1
    fi
}

check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        print_error "Kan OS niet detecteren"
        exit 1
    fi

    if [ "$OS" != "ubuntu" ]; then
        print_warning "Dit script is getest op Ubuntu 24.04. Je OS: $OS $VER"
        read -p "Wil je doorgaan? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

show_menu() {
    print_banner
    echo -e "${CYAN}Dit script zal de volgende stappen uitvoeren:${NC}"
    echo ""
    echo "  1️⃣  System updates en voorbereiding"
    echo "  2️⃣  CLI Tools installatie (GitHub CLI, Claude Code CLI, Jira CLI, Docker)"
    echo "  3️⃣  Infrastructure setup (Node.js, MySQL, Nginx, PM2)"
    echo "  4️⃣  Applicatie deployment"
    echo "  5️⃣  Service configuratie (GitHub, Slack, Email, Jira, Claude API)"
    echo ""
    echo -e "${YELLOW}Geschatte tijd: 15-20 minuten${NC}"
    echo ""
    read -p "Wil je doorgaan met de complete setup? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup geannuleerd"
        exit 0
    fi
}

# ============================================
# STAP 1: System Updates
# ============================================
step1_system_updates() {
    print_header "Stap 1/5: System Updates"

    print_step "Updaten van package lijst..."
    apt update

    print_step "Upgraden van geïnstalleerde packages..."
    apt upgrade -y

    print_success "System updates voltooid"
}

# ============================================
# STAP 2: CLI Tools
# ============================================
step2_cli_tools() {
    print_header "Stap 2/5: CLI Tools Installatie"

    # GitHub CLI
    print_step "Installeren van GitHub CLI..."
    if command -v gh &> /dev/null; then
        print_success "GitHub CLI al geïnstalleerd"
    else
        mkdir -p -m 755 /etc/apt/keyrings
        wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
        chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        apt update
        apt install -y gh
        print_success "GitHub CLI geïnstalleerd"
    fi

    # Node.js (voor Claude CLI)
    print_step "Installeren van Node.js 20..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
        print_success "Node.js geïnstalleerd: $(node --version)"
    else
        print_success "Node.js al geïnstalleerd: $(node --version)"
    fi

    # Claude Code CLI
    print_step "Installeren van Claude Code CLI..."
    if ! command -v claude &> /dev/null; then
        npm install -g @anthropics/claude-code 2>/dev/null || print_warning "Claude CLI installatie optioneel"
    fi

    # Jira CLI (optioneel)
    read -p "Wil je Jira CLI installeren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Installeren van Jira CLI..."
        GO_JIRA_VERSION="1.0.27"
        wget -q "https://github.com/go-jira/jira/releases/download/v${GO_JIRA_VERSION}/jira-linux-amd64" -O /tmp/jira
        mv /tmp/jira /usr/local/bin/jira
        chmod +x /usr/local/bin/jira
        print_success "Jira CLI geïnstalleerd"
    fi

    # Docker (optioneel)
    read -p "Wil je Docker installeren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Installeren van Docker..."
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
            sh /tmp/get-docker.sh
            rm /tmp/get-docker.sh
            print_success "Docker geïnstalleerd"
        else
            print_success "Docker al geïnstalleerd"
        fi
    fi

    # Extra tools
    print_step "Installeren van extra developer tools..."
    apt install -y git curl wget jq vim htop tree unzip build-essential

    print_success "CLI Tools installatie voltooid"
}

# ============================================
# STAP 3: Infrastructure
# ============================================
step3_infrastructure() {
    print_header "Stap 3/5: Infrastructure Setup"

    # MySQL
    print_step "Installeren van MySQL Server..."
    if ! command -v mysql &> /dev/null; then
        apt install -y mysql-server
        systemctl start mysql
        systemctl enable mysql
        print_success "MySQL geïnstalleerd en gestart"
    else
        print_success "MySQL al geïnstalleerd"
    fi

    # Nginx
    print_step "Installeren van Nginx..."
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
        print_success "Nginx geïnstalleerd en gestart"
    else
        print_success "Nginx al geïnstalleerd"
    fi

    # PM2
    print_step "Installeren van PM2..."
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        print_success "PM2 geïnstalleerd"
    else
        print_success "PM2 al geïnstalleerd"
    fi

    print_success "Infrastructure setup voltooid"
}

# ============================================
# STAP 4: Database & Applicatie
# ============================================
step4_application() {
    print_header "Stap 4/5: Database & Applicatie Setup"

    # Database configuratie
    print_step "Database configuratie..."
    echo ""
    print_info "Je moet nu de MySQL database configureren"
    echo ""
    read -p "Database wachtwoord voor '$DB_USER': " DB_PASSWORD
    echo ""

    # MySQL configuratie
    print_step "Configureren van MySQL database..."
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

    print_success "Database geconfigureerd"

    # Applicatie gebruiker
    print_step "Maken van applicatie gebruiker..."
    if ! id "$APP_USER" &>/dev/null; then
        adduser --system --group --home $APP_DIR $APP_USER
        print_success "Gebruiker $APP_USER aangemaakt"
    else
        print_success "Gebruiker $APP_USER bestaat al"
    fi

    # Applicatie directory
    print_step "Setup applicatie directory..."
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/logs
    mkdir -p $APP_DIR/.claude/workflows

    # Kopieer applicatie bestanden
    if [ -d "/tmp/insurance-orchestrator" ]; then
        print_step "Kopiëren van applicatie bestanden..."
        cp -r /tmp/insurance-orchestrator/* $APP_DIR/ 2>/dev/null || true
        chown -R $APP_USER:$APP_USER $APP_DIR
        print_success "Applicatie bestanden gekopieerd"
    else
        print_warning "Applicatie bestanden niet gevonden in /tmp/insurance-orchestrator"
        print_info "Upload eerst de bestanden met:"
        print_info "  rsync -avz --exclude 'node_modules' --exclude '.next' ./ user@vps:/tmp/insurance-orchestrator/"
        echo ""
        read -p "Druk op Enter wanneer de bestanden zijn geüpload..."

        if [ -d "/tmp/insurance-orchestrator" ]; then
            cp -r /tmp/insurance-orchestrator/* $APP_DIR/
            chown -R $APP_USER:$APP_USER $APP_DIR
            print_success "Applicatie bestanden gekopieerd"
        else
            print_error "Applicatie bestanden nog steeds niet gevonden"
            exit 1
        fi
    fi

    # Environment variabelen
    print_step "Configureren van environment variabelen..."
    cat > $APP_DIR/.env <<EOF
DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@localhost:3306/$DB_NAME"
NODE_ENV=production
PORT=3000
EOF

    chmod 600 $APP_DIR/.env
    chown $APP_USER:$APP_USER $APP_DIR/.env
    print_success "Environment variabelen geconfigureerd"

    # Dependencies
    print_step "Installeren van Node.js dependencies..."
    cd $APP_DIR
    sudo -u $APP_USER npm install

    # Prisma
    print_step "Setup Prisma database..."
    sudo -u $APP_USER npx prisma generate
    sudo -u $APP_USER npx prisma db push

    # Build
    print_step "Bouwen van applicatie..."
    sudo -u $APP_USER npm run build

    # PM2 Setup
    print_step "Configureren van PM2..."
    if [ -f "$APP_DIR/ecosystem.config.js" ]; then
        sudo -u $APP_USER pm2 delete insurance-orchestrator 2>/dev/null || true
        sudo -u $APP_USER pm2 start $APP_DIR/ecosystem.config.js
        sudo -u $APP_USER pm2 save

        # PM2 startup
        env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp $APP_DIR
        print_success "PM2 geconfigureerd"
    fi

    # Nginx
    print_step "Configureren van Nginx..."
    if [ -f "$APP_DIR/nginx.conf" ]; then
        cp $APP_DIR/nginx.conf /etc/nginx/sites-available/insurance-orchestrator
        ln -sf /etc/nginx/sites-available/insurance-orchestrator /etc/nginx/sites-enabled/
        nginx -t && systemctl restart nginx
        print_success "Nginx geconfigureerd"
    fi

    # Firewall
    print_step "Configureren van firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable

    print_success "Applicatie deployment voltooid"
}

# ============================================
# STAP 5: Services Configuratie
# ============================================
step5_services() {
    print_header "Stap 5/5: Services Configuratie"

    print_info "Nu gaan we de service categories configureren"
    print_info "Deze configuraties worden gebruikt door de workflow services"
    echo ""

    # GitHub
    print_step "GitHub Configuratie"
    read -p "GitHub repository owner: " GH_OWNER
    read -p "GitHub repository naam: " GH_REPO
    read -p "Default branch [main]: " GH_BRANCH
    GH_BRANCH=${GH_BRANCH:-main}

    # Test GitHub
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        if gh repo view "$GH_OWNER/$GH_REPO" &> /dev/null; then
            print_success "GitHub repository geverifieerd: $GH_OWNER/$GH_REPO"
        else
            print_warning "Repository niet gevonden, maar configuratie wordt opgeslagen"
        fi
    else
        print_warning "GitHub CLI niet authenticated. Run later: gh auth login"
    fi

    # Slack (optioneel)
    echo ""
    read -p "Wil je Slack configureren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Slack Configuratie"
        read -p "Slack Webhook URL: " SLACK_WEBHOOK
        read -p "Default channel [#general]: " SLACK_CHANNEL
        SLACK_CHANNEL=${SLACK_CHANNEL:-#general}
        read -p "Bot naam [Zyra Bot]: " SLACK_BOT_NAME
        SLACK_BOT_NAME=${SLACK_BOT_NAME:-Zyra Bot}
    fi

    # Email (optioneel)
    echo ""
    read -p "Wil je Email configureren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Email/SMTP Configuratie"
        read -p "SMTP Host: " SMTP_HOST
        read -p "SMTP Port [587]: " SMTP_PORT
        SMTP_PORT=${SMTP_PORT:-587}
        read -p "SMTP Username: " SMTP_USER
        read -s -p "SMTP Password: " SMTP_PASSWORD
        echo ""
        read -p "From Email: " FROM_EMAIL
        read -p "From Name [Zyra]: " FROM_NAME
        FROM_NAME=${FROM_NAME:-Zyra}
    fi

    # Anthropic (optioneel)
    echo ""
    read -p "Wil je Claude API configureren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Anthropic Claude API Configuratie"
        read -s -p "Anthropic API Key: " ANTHROPIC_KEY
        echo ""
    fi

    # Project path voor database import
    echo ""
    read -p "Project path voor configuratie: " PROJECT_PATH

    # Import naar database
    print_step "Importeren van configuratie naar database..."

    # GitHub config
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME <<EOF
-- Ensure project exists
INSERT INTO Project (id, name, path, createdAt, updatedAt)
VALUES (UUID(), 'Default', '$PROJECT_PATH', NOW(), NOW())
ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- GitHub category
INSERT INTO ServiceCategoryConfig (id, projectPath, categoryId, configValues, createdAt, updatedAt)
VALUES (
    UUID(),
    '$PROJECT_PATH',
    'github',
    JSON_OBJECT(
        'owner', '$GH_OWNER',
        'repo', '$GH_REPO',
        'default_branch', '$GH_BRANCH'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'owner', '$GH_OWNER',
        'repo', '$GH_REPO',
        'default_branch', '$GH_BRANCH'
    ),
    updatedAt = NOW();
EOF

    # Slack config (if configured)
    if [ -n "$SLACK_WEBHOOK" ]; then
        mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME <<EOF
INSERT INTO ServiceCategoryConfig (id, projectPath, categoryId, configValues, createdAt, updatedAt)
VALUES (
    UUID(),
    '$PROJECT_PATH',
    'slack',
    JSON_OBJECT(
        'webhook_url', '$SLACK_WEBHOOK',
        'default_channel', '$SLACK_CHANNEL',
        'bot_name', '$SLACK_BOT_NAME'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'webhook_url', '$SLACK_WEBHOOK',
        'default_channel', '$SLACK_CHANNEL',
        'bot_name', '$SLACK_BOT_NAME'
    ),
    updatedAt = NOW();
EOF
    fi

    # Email config (if configured)
    if [ -n "$SMTP_HOST" ]; then
        mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME <<EOF
INSERT INTO ServiceCategoryConfig (id, projectPath, categoryId, configValues, createdAt, updatedAt)
VALUES (
    UUID(),
    '$PROJECT_PATH',
    'email',
    JSON_OBJECT(
        'smtp_host', '$SMTP_HOST',
        'smtp_port', '$SMTP_PORT',
        'smtp_user', '$SMTP_USER',
        'smtp_password', '$SMTP_PASSWORD',
        'from_email', '$FROM_EMAIL',
        'from_name', '$FROM_NAME'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'smtp_host', '$SMTP_HOST',
        'smtp_port', '$SMTP_PORT',
        'smtp_user', '$SMTP_USER',
        'smtp_password', '$SMTP_PASSWORD',
        'from_email', '$FROM_EMAIL',
        'from_name', '$FROM_NAME'
    ),
    updatedAt = NOW();
EOF
    fi

    print_success "Services configuratie voltooid"
}

# ============================================
# Summary
# ============================================
show_summary() {
    print_header "🎉 Setup Voltooid! 🎉"

    echo -e "${GREEN}Alle stappen zijn succesvol voltooid!${NC}"
    echo ""
    echo "✅ System updates"
    echo "✅ CLI Tools geïnstalleerd"
    echo "✅ Infrastructure opgezet"
    echo "✅ Applicatie gedeployed"
    echo "✅ Services geconfigureerd"
    echo ""

    # Server info
    SERVER_IP=$(hostname -I | awk '{print $1}')

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  📍 Je applicatie is nu bereikbaar op:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  🌐  ${GREEN}http://$SERVER_IP${NC}"
    echo ""
    echo -e "${YELLOW}  🔐 Eerste keer? Registreer met je vingerafdruk!${NC}"
    echo -e "     1. Open de browser"
    echo -e "     2. Klik op 'Registreren'"
    echo -e "     3. Vul naam en email in"
    echo -e "     4. Scan je vingerafdruk"
    echo -e "     5. Je bent nu ingelogd als admin!"
    echo ""

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  🔧 Nuttige Commando's:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Status bekijken:"
    echo "    sudo -u $APP_USER pm2 status"
    echo ""
    echo "  Logs bekijken:"
    echo "    sudo -u $APP_USER pm2 logs"
    echo ""
    echo "  Applicatie herstarten:"
    echo "    sudo -u $APP_USER pm2 restart insurance-orchestrator"
    echo ""
    echo "  GitHub authenticatie:"
    echo "    gh auth login"
    echo ""

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  📚 Documentatie:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  📖 README.md              - Project overzicht"
    echo "  📖 SETUP-GUIDE.md         - Complete setup guide"
    echo "  📖 COMMANDS-CHEATSHEET.md - Handige commando's"
    echo "  📖 DEPLOYMENT.md          - Deployment details"
    echo ""

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  🔐 Aanbevolen: SSL/HTTPS Setup${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Als je een domein hebt, setup SSL met Let's Encrypt:"
    echo ""
    echo "    apt install certbot python3-certbot-nginx"
    echo "    certbot --nginx -d jouw-domein.nl"
    echo ""

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🚀 Klaar om te starten! Open je browser en bouw je eerste workflow!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# Main Functie
# ============================================
main() {
    print_banner
    check_root
    check_os
    show_menu

    # Voer alle stappen uit
    step1_system_updates
    step2_cli_tools
    step3_infrastructure
    step4_application
    step5_services

    # Toon summary
    show_summary
}

# Run main
main
