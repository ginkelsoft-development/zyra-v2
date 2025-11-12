# Commands Cheat Sheet

Snelle referentie voor alle belangrijke commando's.

## 🚀 Setup & Deployment

### Upload naar VPS
```bash
# Upload applicatie
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ./ user@vps-ip:/tmp/insurance-orchestrator/

# Upload enkel een script
scp setup-cli-tools.sh user@vps-ip:~/
```

### Volledige Setup (in volgorde)
```bash
# 1. CLI Tools installeren
./setup-cli-tools.sh

# 2. Applicatie deployen
sudo ./deploy.sh

# 3. Services configureren
./configure-services.sh
```

## 🔧 Applicatie Management

### PM2 Commando's
```bash
# Status
sudo -u orchestrator pm2 status

# Start
sudo -u orchestrator pm2 start insurance-orchestrator

# Stop
sudo -u orchestrator pm2 stop insurance-orchestrator

# Restart
sudo -u orchestrator pm2 restart insurance-orchestrator

# Logs (real-time)
sudo -u orchestrator pm2 logs insurance-orchestrator

# Logs (laatste 100 regels)
sudo -u orchestrator pm2 logs insurance-orchestrator --lines 100

# Monitoring dashboard
sudo -u orchestrator pm2 monit

# Save PM2 lijst
sudo -u orchestrator pm2 save

# Lijst alle processen
sudo -u orchestrator pm2 list
```

### Development
```bash
# Start dev server
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

## 🗄️ Database

### MySQL Commando's
```bash
# Connect
mysql -u zyra_user -p zyra_orchestrator

# Backup
mysqldump -u zyra_user -p zyra_orchestrator > backup_$(date +%Y%m%d).sql

# Backup met timestamp
mysqldump -u zyra_user -p zyra_orchestrator | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
mysql -u zyra_user -p zyra_orchestrator < backup.sql

# Check tables
mysql -u zyra_user -p zyra_orchestrator -e "SHOW TABLES;"

# Check service configs
mysql -u zyra_user -p zyra_orchestrator -e "SELECT * FROM ServiceCategoryConfig;"
```

### Prisma Commando's
```bash
# Generate client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name

# Reset database (DESTRUCTIVE!)
npx prisma migrate reset
```

## 🌐 Nginx

### Nginx Commando's
```bash
# Test configuratie
sudo nginx -t

# Reload configuratie
sudo nginx -s reload

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Stop
sudo systemctl stop nginx

# Start
sudo systemctl start nginx

# Enable auto-start
sudo systemctl enable nginx

# Bekijk access logs
sudo tail -f /var/log/nginx/insurance-orchestrator-access.log

# Bekijk error logs
sudo tail -f /var/log/nginx/insurance-orchestrator-error.log

# Laatste 100 errors
sudo tail -n 100 /var/log/nginx/insurance-orchestrator-error.log
```

## 🔐 SSL/TLS

### Certbot (Let's Encrypt)
```bash
# Verkrijg certificaat
sudo certbot --nginx -d jouw-domein.nl -d www.jouw-domein.nl

# Renew alle certificaten
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run

# List certificaten
sudo certbot certificates

# Revoke certificaat
sudo certbot revoke --cert-path /etc/letsencrypt/live/jouw-domein.nl/cert.pem
```

## 🐙 GitHub CLI

### GitHub Authenticatie
```bash
# Login
gh auth login

# Status
gh auth status

# Logout
gh auth logout

# Refresh
gh auth refresh
```

### Repository Commando's
```bash
# View repository
gh repo view owner/repo

# List repositories
gh repo list

# Clone repository
gh repo clone owner/repo
```

### Issues
```bash
# List issues
gh issue list

# View issue
gh issue view 123

# Create issue
gh issue create

# List open issues
gh issue list --state open

# List issues with label
gh issue list --label bug

# List issues without label
gh issue list --label '!in-review'
```

### Pull Requests
```bash
# List PRs
gh pr list

# View PR
gh pr view 123

# Create PR
gh pr create

# Checkout PR
gh pr checkout 123

# Merge PR
gh pr merge 123
```

## 🤖 Claude Code CLI

### Claude Commando's
```bash
# Start Claude Code
claude code

# Help
claude --help

# Version
claude --version

# Check config
cat ~/.claude/config.json
```

## 📊 Jira CLI

### Jira Commando's
```bash
# List issues
jira ls

# View issue
jira view PROJ-123

# Create issue
jira create

# Assign issue
jira assign PROJ-123 username

# Transition issue
jira transition PROJ-123 "In Progress"

# Comment on issue
jira comment PROJ-123 "My comment"
```

## 🐳 Docker

### Docker Commando's
```bash
# List containers
docker ps

# List all containers
docker ps -a

# List images
docker images

# Stop container
docker stop container_name

# Start container
docker start container_name

# Remove container
docker rm container_name

# Remove image
docker rmi image_name

# Logs
docker logs container_name

# Follow logs
docker logs -f container_name

# Exec into container
docker exec -it container_name bash
```

### Docker Compose
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Restart service
docker-compose restart service_name
```

## 🔥 Firewall (UFW)

### UFW Commando's
```bash
# Status
sudo ufw status

# Enable
sudo ufw enable

# Disable
sudo ufw disable

# Allow port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Deny port
sudo ufw deny 8080/tcp

# Delete rule
sudo ufw delete allow 80/tcp

# Reset (remove all rules)
sudo ufw reset
```

## 📦 System

### Service Management
```bash
# Status van een service
sudo systemctl status nginx

# Start service
sudo systemctl start nginx

# Stop service
sudo systemctl stop nginx

# Restart service
sudo systemctl restart nginx

# Enable auto-start
sudo systemctl enable nginx

# Disable auto-start
sudo systemctl disable nginx

# Reload service config
sudo systemctl reload nginx
```

### System Info
```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU info
lscpu

# System uptime
uptime

# Running processes
top
htop

# Port usage
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000
```

### Updates
```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Full upgrade
sudo apt full-upgrade -y

# Auto remove unused packages
sudo apt autoremove -y

# Clean package cache
sudo apt clean
```

## 🔍 Logs & Debugging

### Logs Bekijken
```bash
# PM2 logs
sudo -u orchestrator pm2 logs

# Nginx access logs
sudo tail -f /var/log/nginx/insurance-orchestrator-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/insurance-orchestrator-error.log

# System logs
sudo journalctl -xe

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### Process Info
```bash
# Find process by port
sudo lsof -i :3000

# Find process by name
ps aux | grep node

# Kill process
kill -9 PID

# Kill by port
sudo fuser -k 3000/tcp
```

## 🔄 Updates & Maintenance

### Update Applicatie
```bash
# Upload nieuwe versie
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@vps-ip:/tmp/insurance-orchestrator-update/

# Op VPS:
sudo -u orchestrator pm2 stop insurance-orchestrator
sudo cp -r /tmp/insurance-orchestrator-update/* /opt/insurance-orchestrator/
cd /opt/insurance-orchestrator
sudo -u orchestrator npm install
sudo -u orchestrator npm run build
sudo -u orchestrator pm2 restart insurance-orchestrator
```

### Reconfigure Services
```bash
# Run wizard opnieuw
./configure-services.sh

# Of handmatig edit config
nano ~/.insurance-orchestrator/services.json
```

## 🆘 Emergency / Troubleshooting

### Quick Fixes
```bash
# Restart alles
sudo -u orchestrator pm2 restart all
sudo systemctl restart nginx

# Check disk space
df -h
# Als vol: clean logs
sudo find /var/log -type f -name "*.log" -mtime +30 -delete

# Check memory
free -h
# Als vol: restart PM2
sudo -u orchestrator pm2 restart all

# Database connection issues
sudo systemctl restart mysql
mysql -u zyra_user -p zyra_orchestrator

# Port already in use
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Full Reset (Nuclear Option)
```bash
# Stop alles
sudo -u orchestrator pm2 stop all
sudo systemctl stop nginx

# Clean builds
cd /opt/insurance-orchestrator
sudo -u orchestrator rm -rf .next
sudo -u orchestrator rm -rf node_modules

# Reinstall
sudo -u orchestrator npm install
sudo -u orchestrator npm run build

# Restart
sudo -u orchestrator pm2 restart all
sudo systemctl start nginx
```

## 📋 Checklists

### Daily Checks
```bash
pm2 status                      # App running?
df -h                          # Disk space OK?
free -h                        # Memory OK?
tail -n 50 /var/log/nginx/...  # Any errors?
```

### Weekly Maintenance
```bash
sudo apt update && sudo apt upgrade -y
sudo certbot renew
mysqldump backup
pm2 logs review
```

### Before Deployment
```bash
npm run build                  # Build succeeds?
npx prisma generate           # Prisma OK?
npm run lint                  # No lint errors?
git status                    # All committed?
```

---

💡 **Tip:** Bookmark deze pagina voor snelle referentie!
