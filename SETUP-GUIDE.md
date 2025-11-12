# Complete Setup Guide - VPS + CLI Tools + Services

Deze guide leidt je door de complete setup van Insurance Orchestrator op een Ubuntu 24 VPS, inclusief alle CLI tools en service configuraties.

## 📋 Overzicht

De setup bestaat uit 3 stappen:
1. **CLI Tools installeren** - GitHub CLI, Claude Code CLI, Jira CLI, Docker
2. **Applicatie deployen** - Next.js app, MySQL, Nginx, PM2
3. **Services configureren** - GitHub, Slack, Email, Jira, Claude API

## 🚀 Stap 1: CLI Tools Setup

### Upload setup script naar VPS

Vanaf je lokale machine:

```bash
scp setup-cli-tools.sh jouw-gebruiker@jouw-vps-ip:~/
```

### Voer CLI tools installatie uit

SSH naar je VPS:

```bash
ssh jouw-gebruiker@jouw-vps-ip
```

Op de VPS:

```bash
chmod +x ~/setup-cli-tools.sh
./setup-cli-tools.sh
```

Het script zal je door de installatie leiden en vragen of je wilt installeren:

- ✅ **GitHub CLI** (verplicht) - Voor GitHub services
- ✅ **Claude Code CLI** (aanbevolen) - Voor AI agent functies
- ⚠️ **Jira CLI** (optioneel) - Als je Jira integratie nodig hebt
- ⚠️ **Docker** (optioneel) - Voor containerized services
- ⚠️ **Extra tools** (optioneel) - git, curl, jq, vim, etc.

### Authenticatie

Het script zal je helpen met authenticatie:

**GitHub CLI:**
```bash
gh auth login
```
Kies: Browser login (aanbevolen) of Personal Access Token

**Claude Code CLI:**
Het script vraagt om je Anthropic API key

**Jira CLI (indien geïnstalleerd):**
Het script vraagt om:
- Jira URL (bijv. https://bedrijf.atlassian.net)
- Email
- API Token (maak aan op: https://id.atlassian.com/manage/api-tokens)

### Verificatie

Na de installatie:

```bash
# Check geïnstalleerde tools
gh --version
claude --version
jira version
docker --version

# Test GitHub authenticatie
gh auth status

# Test GitHub repository toegang
gh repo view owner/repo
```

## 🚀 Stap 2: Applicatie Deployment

### Upload applicatie bestanden

Vanaf je lokale machine:

```bash
cd /Users/wietsevanginkel/Agents/insurance-orchestrator

# Upload alle bestanden
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ./ jouw-gebruiker@jouw-vps-ip:/tmp/insurance-orchestrator/
```

### Voer deployment uit

Op de VPS:

```bash
sudo cp /tmp/insurance-orchestrator/deploy.sh /root/
sudo chmod +x /root/deploy.sh
sudo /root/deploy.sh
```

Het deployment script zal:
1. ✅ Systeem updates installeren
2. ✅ Node.js 20 installeren
3. ✅ MySQL Server installeren
4. ✅ Nginx installeren
5. ✅ PM2 process manager installeren
6. ⏸️ Pauzeren voor database setup (je moet SQL commando's uitvoeren)
7. ⏸️ Pauzeren voor applicatie bestanden upload bevestiging
8. ✅ Dependencies installeren
9. ✅ Environment variabelen configureren
10. ✅ Prisma database setup
11. ✅ Applicatie builden
12. ✅ PM2 configureren
13. ✅ Nginx configureren
14. ✅ Firewall configureren

### Database Setup

Wanneer het script pauzeert voor database setup:

```bash
# Open MySQL
sudo mysql -u root -p

# Voer uit:
CREATE DATABASE zyra_orchestrator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zyra_user'@'localhost' IDENTIFIED BY 'JouwSterkWachtwoord123!';
GRANT ALL PRIVILEGES ON zyra_orchestrator.* TO 'zyra_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Druk op Enter om door te gaan.

### Test de applicatie

Open je browser:
```
http://jouw-vps-ip
```

Je zou de Insurance Orchestrator interface moeten zien.

## 🚀 Stap 3: Services Configureren

Nu de applicatie draait, configureer je de service categories.

### Upload configuratie script

Vanaf je lokale machine:

```bash
scp configure-services.sh jouw-gebruiker@jouw-vps-ip:~/
```

### Voer service configuratie uit

Op de VPS:

```bash
chmod +x ~/configure-services.sh
./configure-services.sh
```

Het script zal je door de configuratie leiden:

### GitHub Configuratie (Verplicht)

```
GitHub repository owner: jouw-username
GitHub repository naam: jouw-repo
Default branch [main]: main
```

Het script test automatisch:
- ✅ GitHub CLI authenticatie
- ✅ Repository toegang

### Slack Configuratie (Optioneel)

Als je Slack notificaties wilt:

1. Maak een Incoming Webhook aan: https://api.slack.com/messaging/webhooks
2. Voer in:
   ```
   Slack Webhook URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   Default channel [#general]: #workflows
   Bot naam [Insurance Bot]: Workflow Bot
   ```

Het script test automatisch de webhook door een test bericht te sturen.

### Email Configuratie (Optioneel)

Als je email notificaties wilt:

```
SMTP Host: smtp.gmail.com
SMTP Port [587]: 587
SMTP Username: jouw-email@gmail.com
SMTP Password: ******* (App Password voor Gmail)
From Email: noreply@jouw-domein.nl
From Name: Insurance Orchestrator
```

**Voor Gmail:**
- Gebruik een App Password: https://myaccount.google.com/apppasswords
- Zorg dat 2FA is ingeschakeld

### Jira Configuratie (Optioneel)

Als je Jira integratie wilt:

```
Jira URL: https://jouw-bedrijf.atlassian.net
Jira Email: jouw-email@bedrijf.nl
Jira API Token: ******* (https://id.atlassian.com/manage/api-tokens)
Default Project Key: PROJ
```

Het script test automatisch de Jira API connectie.

### Claude API Configuratie (Optioneel)

Als je AI agents wilt gebruiken:

```
Anthropic API Key: sk-ant-...
```

Verkrijg je API key op: https://console.anthropic.com/

Het script test automatisch de API key.

### Database Import

Na alle configuraties:

```
Wil je deze configuratie importeren in de applicatie database? (y)

Database host [localhost]: localhost
Database port [3306]: 3306
Database naam [zyra_orchestrator]: zyra_orchestrator
Database user [zyra_user]: zyra_user
Database password: *******
Project path: /pad/naar/je/project
```

Het script importeert automatisch alle configuraties in de database.

## ✅ Verificatie

### Check Services Status

```bash
# Applicatie status
sudo -u orchestrator pm2 status

# Logs bekijken
sudo -u orchestrator pm2 logs

# Nginx status
sudo systemctl status nginx

# Test GitHub service
gh repo view jouw-owner/jouw-repo

# Test Slack (als geconfigureerd)
# Check je Slack channel voor het test bericht
```

### Test in Applicatie

1. Open browser: `http://jouw-vps-ip`
2. Ga naar Projects
3. Maak een nieuwe workflow
4. Voeg een GitHub Issues service toe
5. De service zou nu "Configured" moeten tonen (groen vinkje)
6. Run de workflow om te testen

## 🔒 SSL/HTTPS Setup (Aanbevolen)

Als je een domein hebt:

```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx

# Verkrijg SSL certificaat
sudo certbot --nginx -d jouw-domein.nl -d www.jouw-domein.nl

# Test auto-renewal
sudo certbot renew --dry-run
```

Je site is nu bereikbaar via: `https://jouw-domein.nl`

## 📊 Configuratie Bestanden Locaties

```
Applicatie:
- /opt/insurance-orchestrator/              # Applicatie directory
- /opt/insurance-orchestrator/.env          # Environment variabelen
- /opt/insurance-orchestrator/logs/         # PM2 logs

CLI Tools:
- ~/.config/gh/                             # GitHub CLI config
- ~/.claude/config.json                     # Claude Code CLI config
- ~/.jira.d/config.yml                      # Jira CLI config

Service Configuratie:
- ~/.insurance-orchestrator/services.json   # Local backup
- Database: ServiceCategoryConfig table     # Actieve configuratie

Nginx:
- /etc/nginx/sites-available/insurance-orchestrator
- /etc/nginx/sites-enabled/insurance-orchestrator

Logs:
- /var/log/nginx/insurance-orchestrator-access.log
- /var/log/nginx/insurance-orchestrator-error.log
- /opt/insurance-orchestrator/logs/pm2-*.log
```

## 🔧 Onderhoud Commando's

### Applicatie

```bash
# Status
sudo -u orchestrator pm2 status

# Herstarten
sudo -u orchestrator pm2 restart insurance-orchestrator

# Logs (real-time)
sudo -u orchestrator pm2 logs

# Stop
sudo -u orchestrator pm2 stop insurance-orchestrator

# Start
sudo -u orchestrator pm2 start insurance-orchestrator
```

### Services Reconfigureren

Om configuratie te wijzigen:

```bash
# Run configuratie wizard opnieuw
./configure-services.sh

# Of handmatig via applicatie:
# 1. Login op http://jouw-vps-ip
# 2. Ga naar Service Categories
# 3. Wijzig configuratie
```

### Database

```bash
# Backup
mysqldump -u zyra_user -p zyra_orchestrator > backup_$(date +%Y%m%d).sql

# Restore
mysql -u zyra_user -p zyra_orchestrator < backup_20240101.sql

# Check configuratie in database
mysql -u zyra_user -p zyra_orchestrator -e "SELECT * FROM ServiceCategoryConfig;"
```

### Updates

Wanneer je code wijzigingen hebt:

```bash
# Upload nieuwe versie
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ jouw-gebruiker@jouw-vps-ip:/tmp/insurance-orchestrator-update/

# Op VPS:
sudo -u orchestrator pm2 stop insurance-orchestrator
sudo cp -r /tmp/insurance-orchestrator-update/* /opt/insurance-orchestrator/
cd /opt/insurance-orchestrator
sudo -u orchestrator npm install
sudo -u orchestrator npm run build
sudo -u orchestrator pm2 restart insurance-orchestrator
```

## 🐛 Troubleshooting

### Applicatie start niet

```bash
# Check logs
sudo -u orchestrator pm2 logs insurance-orchestrator --lines 100

# Check database connectie
mysql -u zyra_user -p zyra_orchestrator

# Check .env bestand
sudo cat /opt/insurance-orchestrator/.env
```

### 502 Bad Gateway

```bash
# Check of app draait
sudo -u orchestrator pm2 status

# Check Nginx configuratie
sudo nginx -t

# Herstart services
sudo -u orchestrator pm2 restart insurance-orchestrator
sudo systemctl restart nginx
```

### Services niet geconfigureerd

```bash
# Check database configuratie
mysql -u zyra_user -p zyra_orchestrator

# In MySQL:
SELECT * FROM ServiceCategoryConfig WHERE categoryId = 'github';

# Run configuratie wizard opnieuw
./configure-services.sh
```

### GitHub service errors

```bash
# Check GitHub CLI
gh auth status

# Re-authenticate
gh auth login

# Test repository toegang
gh repo view owner/repo

# Check configuratie
gh api user
```

## 📚 Volgende Stappen

1. ✅ **Maak je eerste workflow**
   - Login op de applicatie
   - Ga naar Projects
   - Maak een nieuw project
   - Bouw een workflow met services en agents

2. ✅ **Setup automatische backups**
   - Zie DEPLOYMENT.md voor cron job setup

3. ✅ **Configureer monitoring**
   ```bash
   sudo -u orchestrator pm2 install pm2-logrotate
   sudo -u orchestrator pm2 monit
   ```

4. ✅ **Security hardening**
   - Enable UFW firewall
   - Setup SSL/TLS
   - Configure fail2ban
   - Regular updates

## 🆘 Support

Voor problemen:
1. Check logs: `sudo -u orchestrator pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/insurance-orchestrator-error.log`
3. Bekijk de troubleshooting sectie in DEPLOYMENT.md
4. Check de configuratie summary: `cat ~/cli-tools-setup-summary.txt`

## 📝 Referenties

- **DEPLOYMENT.md** - Gedetailleerde deployment guide
- **QUICKSTART-VPS.md** - Snelle deployment
- **setup-cli-tools.sh** - CLI tools installatie script
- **configure-services.sh** - Services configuratie script
- **deploy.sh** - Applicatie deployment script

Happy orchestrating! 🎉
