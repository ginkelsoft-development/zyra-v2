# Quick Start Guide - VPS Deployment

Deze quick start guide helpt je om snel te deployen naar je Ubuntu 24 VPS.

## Optie 1: Automatisch (Aanbevolen)

### Stap 1: Upload bestanden naar VPS

Vanaf je lokale machine:

```bash
# Upload alle bestanden (exclusief node_modules en .next)
cd /Users/wietsevanginkel/Agents/insurance-orchestrator
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ./ jouw-gebruiker@jouw-vps-ip:/tmp/insurance-orchestrator/
```

### Stap 2: Voer deployment script uit op VPS

SSH naar je VPS:

```bash
ssh jouw-gebruiker@jouw-vps-ip
```

Op de VPS:

```bash
# Kopieer deploy script
sudo cp /tmp/insurance-orchestrator/deploy.sh /root/
sudo chmod +x /root/deploy.sh

# Voer deployment uit
sudo /root/deploy.sh
```

Het script zal je door het proces leiden. Je moet:
1. De MySQL database configureren (script geeft SQL commando's)
2. De applicatie bestanden bevestigen
3. Een database wachtwoord invoeren

### Stap 3: Configureer GitHub CLI (optioneel)

Als je GitHub services gebruikt:

```bash
sudo -u orchestrator gh auth login
```

### Stap 4: Test de applicatie

Open je browser en ga naar `http://jouw-vps-ip`

## Optie 2: Handmatig

Volg de gedetailleerde stappen in `DEPLOYMENT.md`.

## Quick Commands

### Applicatie status
```bash
sudo -u orchestrator pm2 status
```

### Logs bekijken
```bash
sudo -u orchestrator pm2 logs
```

### Applicatie herstarten
```bash
sudo -u orchestrator pm2 restart insurance-orchestrator
```

### Nginx status
```bash
sudo systemctl status nginx
```

### Database backup
```bash
mysqldump -u zyra_user -p zyra_orchestrator > backup.sql
```

## SSL/HTTPS Setup

Als je een domein hebt:

```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx

# Verkrijg certificaat
sudo certbot --nginx -d jouw-domein.nl

# Auto-renewal testen
sudo certbot renew --dry-run
```

## Troubleshooting

### 502 Bad Gateway

Check of de applicatie draait:
```bash
sudo -u orchestrator pm2 status
sudo -u orchestrator pm2 logs
```

### Database connectie errors

Test database connectie:
```bash
mysql -u zyra_user -p zyra_orchestrator
```

Check .env bestand:
```bash
sudo cat /opt/insurance-orchestrator/.env
```

### Port 3000 already in use

Stop andere processen:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
sudo -u orchestrator pm2 restart insurance-orchestrator
```

## Updates Uitvoeren

Als je wijzigingen hebt gemaakt:

```bash
# Upload nieuwe bestanden
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ./ jouw-gebruiker@jouw-vps-ip:/tmp/insurance-orchestrator-update/

# Op de VPS
sudo -u orchestrator pm2 stop insurance-orchestrator
sudo cp -r /tmp/insurance-orchestrator-update/* /opt/insurance-orchestrator/
cd /opt/insurance-orchestrator
sudo -u orchestrator npm install
sudo -u orchestrator npm run build
sudo -u orchestrator pm2 restart insurance-orchestrator
```

## Monitoring

### Setup monitoring dashboard
```bash
sudo -u orchestrator pm2 install pm2-logrotate
sudo -u orchestrator pm2 set pm2-logrotate:max_size 10M
```

### Bekijk resource gebruik
```bash
sudo -u orchestrator pm2 monit
```

## Backup Strategie

### Automatische dagelijkse backup

Maak backup script:
```bash
sudo nano /usr/local/bin/backup-orchestrator.sh
```

Voeg toe:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u zyra_user -p'JouwWachtwoord' zyra_orchestrator | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Applicatie data backup
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz /opt/insurance-orchestrator/.claude

# Verwijder oude backups (ouder dan 30 dagen)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Maak executable:
```bash
sudo chmod +x /usr/local/bin/backup-orchestrator.sh
```

Add to crontab:
```bash
sudo crontab -e
```

Voeg toe:
```cron
0 2 * * * /usr/local/bin/backup-orchestrator.sh >> /var/log/orchestrator-backup.log 2>&1
```

## Meer Informatie

Voor gedetailleerde instructies en troubleshooting, zie `DEPLOYMENT.md`.
