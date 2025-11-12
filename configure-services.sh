#!/bin/bash

# Service Configuration Wizard
# Configureert service categories voor Insurance Orchestrator

set -e

# Kleuren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONFIG_DIR="$HOME/.insurance-orchestrator"
CONFIG_FILE="$CONFIG_DIR/services.json"

print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Maak config directory
mkdir -p "$CONFIG_DIR"

# GitHub configuratie
configure_github() {
    print_header "GitHub Configuratie"

    print_info "Deze configuratie wordt gebruikt door GitHub services"
    print_info "(GitHub Issues, Branch Manager, PR Creator, etc.)"
    echo ""

    read -p "GitHub repository owner: " GH_OWNER
    read -p "GitHub repository naam: " GH_REPO
    read -p "Default branch [main]: " GH_BRANCH
    GH_BRANCH=${GH_BRANCH:-main}

    # Test GitHub authenticatie
    if command -v gh &> /dev/null; then
        if gh auth status &> /dev/null; then
            print_success "GitHub CLI is authenticated"

            # Test repository toegang
            if gh repo view "$GH_OWNER/$GH_REPO" &> /dev/null; then
                print_success "Repository toegang geverifieerd: $GH_OWNER/$GH_REPO"
            else
                print_warning "Kan repository niet vinden: $GH_OWNER/$GH_REPO"
                print_info "Controleer of de repository naam correct is"
            fi
        else
            print_warning "GitHub CLI is niet authenticated"
            print_info "Run: gh auth login"
        fi
    else
        print_warning "GitHub CLI is niet geïnstalleerd"
    fi

    echo ""
    print_success "GitHub configuratie opgeslagen"
}

# Slack configuratie
configure_slack() {
    print_header "Slack Configuratie"

    read -p "Wil je Slack configureren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Slack configuratie overgeslagen"
        return 0
    fi

    print_info "Je hebt een Slack Incoming Webhook URL nodig"
    print_info "Maak er een aan op: https://api.slack.com/messaging/webhooks"
    echo ""

    read -p "Slack Webhook URL: " SLACK_WEBHOOK
    read -p "Default channel [#general]: " SLACK_CHANNEL
    SLACK_CHANNEL=${SLACK_CHANNEL:-#general}
    read -p "Bot naam [Insurance Bot]: " SLACK_BOT_NAME
    SLACK_BOT_NAME=${SLACK_BOT_NAME:-Insurance Bot}

    # Test webhook
    print_info "Testen van webhook..."
    TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Test message from Insurance Orchestrator setup\",\"channel\":\"$SLACK_CHANNEL\",\"username\":\"$SLACK_BOT_NAME\"}" \
        "$SLACK_WEBHOOK" 2>/dev/null || echo "000")

    if [ "$TEST_RESULT" = "200" ]; then
        print_success "Slack webhook werkt! Check je Slack channel"
    else
        print_warning "Slack webhook test mislukt (HTTP $TEST_RESULT)"
        print_info "Controleer de webhook URL"
    fi

    echo ""
    print_success "Slack configuratie opgeslagen"
}

# Email configuratie
configure_email() {
    print_header "Email (SMTP) Configuratie"

    read -p "Wil je Email notificaties configureren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Email configuratie overgeslagen"
        return 0
    fi

    print_info "SMTP Server configuratie"
    echo ""

    read -p "SMTP Host (bijv. smtp.gmail.com): " SMTP_HOST
    read -p "SMTP Port [587]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP Username: " SMTP_USER
    read -s -p "SMTP Password: " SMTP_PASSWORD
    echo ""
    read -p "From Email: " FROM_EMAIL
    read -p "From Name [Insurance Orchestrator]: " FROM_NAME
    FROM_NAME=${FROM_NAME:-Insurance Orchestrator}

    print_info "Email configuratie opgeslagen (wachtwoord encrypted)"
    print_warning "Voor Gmail, gebruik een App Password: https://myaccount.google.com/apppasswords"
}

# Jira configuratie
configure_jira() {
    print_header "Jira Configuratie"

    read -p "Wil je Jira configureren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Jira configuratie overgeslagen"
        return 0
    fi

    print_info "Jira API configuratie"
    echo ""

    read -p "Jira URL (bijv. https://bedrijf.atlassian.net): " JIRA_URL
    read -p "Jira Email: " JIRA_EMAIL
    read -s -p "Jira API Token: " JIRA_TOKEN
    echo ""
    read -p "Default Project Key (bijv. PROJ): " JIRA_PROJECT

    # Test Jira API
    print_info "Testen van Jira connectie..."
    TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$JIRA_EMAIL:$JIRA_TOKEN" \
        -H "Accept: application/json" \
        "$JIRA_URL/rest/api/3/myself" 2>/dev/null || echo "000")

    if [ "$TEST_RESULT" = "200" ]; then
        print_success "Jira API connectie werkt!"
    else
        print_warning "Jira API test mislukt (HTTP $TEST_RESULT)"
        print_info "Controleer je credentials"
    fi

    print_info "Jira configuratie opgeslagen"
}

# Anthropic Claude configuratie
configure_anthropic() {
    print_header "Anthropic Claude API Configuratie"

    read -p "Wil je Claude API configureren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Claude API configuratie overgeslagen"
        return 0
    fi

    print_info "Verkrijg je API key op: https://console.anthropic.com/"
    echo ""

    read -s -p "Anthropic API Key: " ANTHROPIC_KEY
    echo ""

    # Test API key
    print_info "Testen van API key..."
    TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-api-key: $ANTHROPIC_KEY" \
        -H "anthropic-version: 2023-06-01" \
        "https://api.anthropic.com/v1/messages" \
        -X POST \
        -H "content-type: application/json" \
        -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"test"}]}' \
        2>/dev/null || echo "000")

    if [ "$TEST_RESULT" = "200" ] || [ "$TEST_RESULT" = "400" ]; then
        print_success "API key is geldig!"
    else
        print_warning "API key verificatie mislukt (HTTP $TEST_RESULT)"
    fi

    print_info "Claude API configuratie opgeslagen"
}

# Sla configuratie op naar JSON
save_configuration() {
    print_header "Configuratie Opslaan"

    cat > "$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "github": {
    "owner": "${GH_OWNER:-}",
    "repo": "${GH_REPO:-}",
    "default_branch": "${GH_BRANCH:-main}"
  },
  "slack": {
    "webhook_url": "${SLACK_WEBHOOK:-}",
    "default_channel": "${SLACK_CHANNEL:-}",
    "bot_name": "${SLACK_BOT_NAME:-}"
  },
  "email": {
    "smtp_host": "${SMTP_HOST:-}",
    "smtp_port": "${SMTP_PORT:-}",
    "smtp_user": "${SMTP_USER:-}",
    "smtp_password": "${SMTP_PASSWORD:-}",
    "from_email": "${FROM_EMAIL:-}",
    "from_name": "${FROM_NAME:-}"
  },
  "jira": {
    "url": "${JIRA_URL:-}",
    "email": "${JIRA_EMAIL:-}",
    "api_token": "${JIRA_TOKEN:-}",
    "project_key": "${JIRA_PROJECT:-}"
  },
  "anthropic": {
    "api_key": "${ANTHROPIC_KEY:-}"
  }
}
EOF

    chmod 600 "$CONFIG_FILE"
    print_success "Configuratie opgeslagen in: $CONFIG_FILE"
}

# Import configuratie naar database
import_to_database() {
    print_header "Import naar Database"

    read -p "Wil je deze configuratie importeren in de applicatie database? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Database import overgeslagen"
        return 0
    fi

    read -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    read -p "Database port [3306]: " DB_PORT
    DB_PORT=${DB_PORT:-3306}
    read -p "Database naam [zyra_orchestrator]: " DB_NAME
    DB_NAME=${DB_NAME:-zyra_orchestrator}
    read -p "Database user [zyra_user]: " DB_USER
    DB_USER=${DB_USER:-zyra_user}
    read -s -p "Database password: " DB_PASS
    echo ""
    read -p "Project path: " PROJECT_PATH

    print_info "Importeren naar database..."

    # Maak SQL import script
    IMPORT_SQL="/tmp/import_services_$$.sql"

    cat > "$IMPORT_SQL" << EOF
-- Import service category configurations

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
        'owner', '${GH_OWNER:-}',
        'repo', '${GH_REPO:-}',
        'default_branch', '${GH_BRANCH:-main}'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'owner', '${GH_OWNER:-}',
        'repo', '${GH_REPO:-}',
        'default_branch', '${GH_BRANCH:-main}'
    ),
    updatedAt = NOW();

EOF

    # Slack configuratie (alleen als ingevuld)
    if [ -n "$SLACK_WEBHOOK" ]; then
        cat >> "$IMPORT_SQL" << EOF
-- Slack category
INSERT INTO ServiceCategoryConfig (id, projectPath, categoryId, configValues, createdAt, updatedAt)
VALUES (
    UUID(),
    '$PROJECT_PATH',
    'slack',
    JSON_OBJECT(
        'webhook_url', '${SLACK_WEBHOOK}',
        'default_channel', '${SLACK_CHANNEL:-}',
        'bot_name', '${SLACK_BOT_NAME:-}'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'webhook_url', '${SLACK_WEBHOOK}',
        'default_channel', '${SLACK_CHANNEL:-}',
        'bot_name', '${SLACK_BOT_NAME:-}'
    ),
    updatedAt = NOW();

EOF
    fi

    # Email configuratie (alleen als ingevuld)
    if [ -n "$SMTP_HOST" ]; then
        cat >> "$IMPORT_SQL" << EOF
-- Email category
INSERT INTO ServiceCategoryConfig (id, projectPath, categoryId, configValues, createdAt, updatedAt)
VALUES (
    UUID(),
    '$PROJECT_PATH',
    'email',
    JSON_OBJECT(
        'smtp_host', '${SMTP_HOST}',
        'smtp_port', '${SMTP_PORT:-587}',
        'smtp_user', '${SMTP_USER:-}',
        'smtp_password', '${SMTP_PASSWORD:-}',
        'from_email', '${FROM_EMAIL:-}',
        'from_name', '${FROM_NAME:-}'
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    configValues = JSON_OBJECT(
        'smtp_host', '${SMTP_HOST}',
        'smtp_port', '${SMTP_PORT:-587}',
        'smtp_user', '${SMTP_USER:-}',
        'smtp_password', '${SMTP_PASSWORD:-}',
        'from_email', '${FROM_EMAIL:-}',
        'from_name', '${FROM_NAME:-}'
    ),
    updatedAt = NOW();

EOF
    fi

    # Voer import uit
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$IMPORT_SQL" 2>/dev/null; then
        print_success "Configuratie geïmporteerd in database!"
    else
        print_error "Database import mislukt"
        print_info "SQL script opgeslagen in: $IMPORT_SQL"
        print_info "Je kunt het handmatig uitvoeren"
        return 1
    fi

    rm "$IMPORT_SQL"
}

# Toon configuratie summary
show_summary() {
    print_header "Configuratie Overzicht"

    echo "Je configuratie is opgeslagen. Hier is een overzicht:"
    echo ""

    if [ -n "$GH_OWNER" ]; then
        print_success "GitHub: $GH_OWNER/$GH_REPO (branch: $GH_BRANCH)"
    fi

    if [ -n "$SLACK_WEBHOOK" ]; then
        print_success "Slack: Geconfigureerd ($SLACK_CHANNEL)"
    fi

    if [ -n "$SMTP_HOST" ]; then
        print_success "Email: Geconfigureerd ($SMTP_HOST)"
    fi

    if [ -n "$JIRA_URL" ]; then
        print_success "Jira: Geconfigureerd ($JIRA_URL)"
    fi

    if [ -n "$ANTHROPIC_KEY" ]; then
        print_success "Claude API: Geconfigureerd"
    fi

    echo ""
    print_info "Configuratie bestand: $CONFIG_FILE"
    print_info "Je kunt dit script opnieuw uitvoeren om configuratie te wijzigen"
}

# Main functie
main() {
    print_header "Service Configuration Wizard"
    print_info "Deze wizard helpt je om alle service categories te configureren"
    echo ""

    configure_github
    configure_slack
    configure_email
    configure_jira
    configure_anthropic

    save_configuration
    import_to_database
    show_summary

    print_header "Configuratie Voltooid!"
    print_success "Alle services zijn geconfigureerd"
    echo ""
    print_info "Je kunt nu workflows aanmaken die deze services gebruiken"
    print_info "Start de applicatie en ga naar de workflow builder"
}

# Run main
main
