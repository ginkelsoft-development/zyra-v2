#!/bin/bash

# CLI Tools Installation Script
# Installeert alle benodigde CLI tools voor Insurance Orchestrator
# Ondersteunt: GitHub CLI, Claude Code CLI, Jira CLI, Slack CLI, Docker

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functies
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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Dit script moet NIET als root draaien"
        print_info "Voer het script uit als normale gebruiker (het vraagt om sudo wanneer nodig)"
        exit 1
    fi
}

# Check OS
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
        print_warning "Dit script is getest op Ubuntu. Je OS: $OS"
        read -p "Wil je doorgaan? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Installeer GitHub CLI
install_github_cli() {
    print_header "GitHub CLI Installatie"

    if command -v gh &> /dev/null; then
        print_success "GitHub CLI is al geïnstalleerd ($(gh --version | head -n 1))"
        return 0
    fi

    print_info "Installeren van GitHub CLI..."

    sudo mkdir -p -m 755 /etc/apt/keyrings
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install -y gh

    print_success "GitHub CLI geïnstalleerd: $(gh --version | head -n 1)"
}

# Configureer GitHub CLI
configure_github_cli() {
    print_header "GitHub CLI Configuratie"

    if gh auth status &> /dev/null; then
        print_success "GitHub CLI is al geconfigureerd"
        gh auth status
        read -p "Wil je opnieuw authenticeren? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    print_info "Authenticeer met GitHub..."
    print_info "Je kunt kiezen voor:"
    print_info "  1. Browser login (aanbevolen)"
    print_info "  2. Personal Access Token"
    echo ""

    gh auth login

    if gh auth status &> /dev/null; then
        print_success "GitHub CLI succesvol geconfigureerd"
    else
        print_error "GitHub CLI configuratie mislukt"
        return 1
    fi
}

# Installeer Claude Code CLI
install_claude_cli() {
    print_header "Claude Code CLI Installatie"

    if command -v claude &> /dev/null; then
        print_success "Claude Code CLI is al geïnstalleerd"
        return 0
    fi

    print_info "Installeren van Claude Code CLI..."

    # Download en installeer Claude Code CLI
    # Controleer eerst of Node.js is geïnstalleerd
    if ! command -v node &> /dev/null; then
        print_error "Node.js is niet geïnstalleerd. Installeer eerst Node.js."
        return 1
    fi

    # Installeer Claude Code CLI via npm
    sudo npm install -g @anthropics/claude-code

    if command -v claude &> /dev/null; then
        print_success "Claude Code CLI geïnstalleerd"
    else
        print_warning "Claude Code CLI installatie mogelijk mislukt"
        print_info "Je kunt het later handmatig installeren met: npm install -g @anthropics/claude-code"
    fi
}

# Configureer Claude Code CLI
configure_claude_cli() {
    print_header "Claude Code CLI Configuratie"

    if [ -f "$HOME/.claude/config.json" ]; then
        print_success "Claude Code CLI is al geconfigureerd"
        read -p "Wil je de configuratie overschrijven? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    print_info "Configureren van Claude Code CLI..."
    echo ""
    read -p "Anthropic API Key: " ANTHROPIC_API_KEY

    mkdir -p "$HOME/.claude"

    cat > "$HOME/.claude/config.json" << EOF
{
  "api_key": "$ANTHROPIC_API_KEY"
}
EOF

    chmod 600 "$HOME/.claude/config.json"
    print_success "Claude Code CLI geconfigureerd"
}

# Installeer Jira CLI
install_jira_cli() {
    print_header "Jira CLI Installatie"

    read -p "Wil je Jira CLI installeren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Jira CLI installatie overgeslagen"
        return 0
    fi

    if command -v jira &> /dev/null; then
        print_success "Jira CLI is al geïnstalleerd"
        return 0
    fi

    print_info "Installeren van Jira CLI..."

    # Download go-jira (populaire Jira CLI)
    GO_JIRA_VERSION="1.0.27"
    wget "https://github.com/go-jira/jira/releases/download/v${GO_JIRA_VERSION}/jira-linux-amd64" -O /tmp/jira
    sudo mv /tmp/jira /usr/local/bin/jira
    sudo chmod +x /usr/local/bin/jira

    if command -v jira &> /dev/null; then
        print_success "Jira CLI geïnstalleerd"
    else
        print_error "Jira CLI installatie mislukt"
        return 1
    fi
}

# Configureer Jira CLI
configure_jira_cli() {
    if ! command -v jira &> /dev/null; then
        return 0
    fi

    print_header "Jira CLI Configuratie"

    if [ -f "$HOME/.jira.d/config.yml" ]; then
        print_success "Jira CLI is al geconfigureerd"
        read -p "Wil je de configuratie overschrijven? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    print_info "Configureren van Jira CLI..."
    echo ""
    read -p "Jira URL (bijv. https://jouw-bedrijf.atlassian.net): " JIRA_URL
    read -p "Jira gebruikersnaam/email: " JIRA_USER
    read -s -p "Jira API Token: " JIRA_TOKEN
    echo ""

    mkdir -p "$HOME/.jira.d"

    cat > "$HOME/.jira.d/config.yml" << EOF
endpoint: $JIRA_URL
user: $JIRA_USER
password-source: pass
authentication-method: api-token
EOF

    # Sla API token veilig op
    echo "$JIRA_TOKEN" > "$HOME/.jira.d/token"
    chmod 600 "$HOME/.jira.d/token"

    print_success "Jira CLI geconfigureerd"
}

# Installeer Docker
install_docker() {
    print_header "Docker Installatie"

    read -p "Wil je Docker installeren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Docker installatie overgeslagen"
        return 0
    fi

    if command -v docker &> /dev/null; then
        print_success "Docker is al geïnstalleerd ($(docker --version))"
        return 0
    fi

    print_info "Installeren van Docker..."

    # Installeer Docker via officiële script
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh

    # Voeg gebruiker toe aan docker groep
    sudo usermod -aG docker $USER

    print_success "Docker geïnstalleerd"
    print_warning "Log uit en weer in om docker zonder sudo te kunnen gebruiken"
}

# Installeer andere nuttige tools
install_additional_tools() {
    print_header "Extra Tools Installatie"

    read -p "Wil je extra developer tools installeren? (git, curl, jq, etc.) (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Extra tools installatie overgeslagen"
        return 0
    fi

    print_info "Installeren van extra tools..."
    sudo apt update
    sudo apt install -y \
        git \
        curl \
        wget \
        jq \
        vim \
        htop \
        tree \
        unzip \
        build-essential

    print_success "Extra tools geïnstalleerd"
}

# Test alle configuraties
test_installations() {
    print_header "Installatie Tests"

    echo "Geïnstalleerde versies:"
    echo ""

    # GitHub CLI
    if command -v gh &> /dev/null; then
        print_success "GitHub CLI: $(gh --version | head -n 1)"
        if gh auth status &> /dev/null; then
            print_success "  └─ Authenticated ✓"
        else
            print_warning "  └─ Not authenticated ✗"
        fi
    else
        print_error "GitHub CLI: Niet geïnstalleerd"
    fi

    # Claude Code CLI
    if command -v claude &> /dev/null; then
        print_success "Claude Code CLI: geïnstalleerd"
        if [ -f "$HOME/.claude/config.json" ]; then
            print_success "  └─ Configured ✓"
        else
            print_warning "  └─ Not configured ✗"
        fi
    else
        print_warning "Claude Code CLI: Niet geïnstalleerd"
    fi

    # Jira CLI
    if command -v jira &> /dev/null; then
        print_success "Jira CLI: geïnstalleerd"
        if [ -f "$HOME/.jira.d/config.yml" ]; then
            print_success "  └─ Configured ✓"
        else
            print_warning "  └─ Not configured ✗"
        fi
    else
        print_info "Jira CLI: Niet geïnstalleerd (optioneel)"
    fi

    # Docker
    if command -v docker &> /dev/null; then
        print_success "Docker: $(docker --version)"
    else
        print_info "Docker: Niet geïnstalleerd (optioneel)"
    fi

    # Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js: Niet geïnstalleerd"
    fi

    # MySQL
    if command -v mysql &> /dev/null; then
        print_success "MySQL: $(mysql --version)"
    else
        print_info "MySQL: Niet geïnstalleerd"
    fi
}

# Maak configuratie summary bestand
create_config_summary() {
    print_header "Configuratie Overzicht"

    SUMMARY_FILE="$HOME/cli-tools-setup-summary.txt"

    cat > "$SUMMARY_FILE" << EOF
CLI Tools Setup Summary
=======================
Datum: $(date)

Geïnstalleerde Tools:
EOF

    if command -v gh &> /dev/null; then
        echo "- GitHub CLI: $(gh --version | head -n 1)" >> "$SUMMARY_FILE"
    fi

    if command -v claude &> /dev/null; then
        echo "- Claude Code CLI: Installed" >> "$SUMMARY_FILE"
    fi

    if command -v jira &> /dev/null; then
        echo "- Jira CLI: Installed" >> "$SUMMARY_FILE"
    fi

    if command -v docker &> /dev/null; then
        echo "- Docker: $(docker --version)" >> "$SUMMARY_FILE"
    fi

    cat >> "$SUMMARY_FILE" << EOF

Configuratie Bestanden:
- GitHub CLI config: ~/.config/gh/
- Claude Code config: ~/.claude/config.json
- Jira CLI config: ~/.jira.d/config.yml

Nuttige Commando's:
-------------------

GitHub CLI:
  gh auth status              # Check authenticatie status
  gh repo list                # Lijst repositories
  gh issue list               # Lijst issues
  gh pr list                  # Lijst pull requests

Claude Code CLI:
  claude --help               # Toon help
  claude code                 # Start Claude Code

Jira CLI:
  jira ls                     # Lijst issues
  jira view ISSUE-123         # Bekijk issue details
  jira create                 # Maak nieuwe issue

Docker:
  docker ps                   # Lijst containers
  docker images               # Lijst images
  docker-compose up           # Start services

Voor meer informatie, zie de documentatie van elke tool.
EOF

    print_success "Configuratie overzicht opgeslagen in: $SUMMARY_FILE"
    echo ""
    cat "$SUMMARY_FILE"
}

# Main functie
main() {
    print_header "CLI Tools Setup Wizard"
    print_info "Dit script installeert en configureert alle benodigde CLI tools"
    echo ""

    check_root
    check_os

    # Installaties
    install_github_cli
    configure_github_cli

    install_claude_cli
    configure_claude_cli

    install_jira_cli
    configure_jira_cli

    install_docker

    install_additional_tools

    # Tests en summary
    test_installations
    create_config_summary

    print_header "Setup Voltooid!"
    print_success "Alle geselecteerde tools zijn geïnstalleerd en geconfigureerd"
    echo ""
    print_info "Volgende stappen:"
    echo "  1. Als je Docker hebt geïnstalleerd, log uit en weer in"
    echo "  2. Test de tools met de commando's in: $HOME/cli-tools-setup-summary.txt"
    echo "  3. Continue met de applicatie deployment (zie DEPLOYMENT.md)"
    echo ""
}

# Run main functie
main
