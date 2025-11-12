# Insurance Orchestrator - Deployment Guide voor Ubuntu 24 VPS

Deze guide helpt je om de Insurance Orchestrator applicatie te installeren op een Ubuntu 24 VPS en beschikbaar te maken via poort 80.

## Vereisten

- Ubuntu 24.04 LTS VPS
- Root of sudo toegang
- Domein naam (optioneel, voor SSL)
- Minimaal 2GB RAM
- 20GB opslagruimte

## Stap 1: Server Voorbereiding

### 1.1 Update het systeem

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Installeer Node.js 20 (LTS)

```bash
# Installeer Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificeer installatie
node --version  # Moet v20.x.x tonen
npm --version
```

### 1.3 Installeer MySQL Server

```bash
# Installeer MySQL
sudo apt install -y mysql-server

# Start en enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Beveilig MySQL installatie
sudo mysql_secure_installation
```

### 1.4 Installeer Nginx

```bash
sudo apt install -y nginx

# Start en enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.5 Installeer PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 1.6 Installeer GitHub CLI (voor GitHub services)

```bash
# Installeer GitHub CLI
sudo mkdir -p -m 755 /etc/apt/keyrings
wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh

# Authenticeer GitHub CLI
gh auth login
```

## Stap 2: Database Setup

### 2.1 Maak database en gebruiker aan

```bash
sudo mysql -u root -p
```

Voer de volgende SQL commando's uit:

```sql
-- Maak database aan
CREATE DATABASE zyra_orchestrator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Maak gebruiker aan (verander het wachtwoord!)
CREATE USER 'zyra_user'@'localhost' IDENTIFIED BY 'JouwSterkWachtwoord123!';

-- Geef rechten
GRANT ALL PRIVILEGES ON zyra_orchestrator.* TO 'zyra_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### 2.2 Test database connectie

```bash
mysql -u zyra_user -p zyra_orchestrator
# Voer het wachtwoord in en type EXIT om te verlaten
```

## Stap 3: Applicatie Installeren

### 3.1 Maak applicatie gebruiker

```bash
# Maak dedicated gebruiker voor de applicatie
sudo adduser --system --group --home /opt/insurance-orchestrator orchestrator
```

### 3.2 Clone of upload de applicatie

Optie A - Via Git (als je een repository hebt):
```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator git clone <jouw-repo-url> .
```

Optie B - Upload via SCP vanaf je lokale machine:
```bash
# Vanaf je lokale machine:
cd /Users/wietsevanginkel/Agents/insurance-orchestrator
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ./ jouw-gebruiker@jouw-vps-ip:/tmp/insurance-orchestrator/

# Op de VPS:
sudo mv /tmp/insurance-orchestrator/* /opt/insurance-orchestrator/
sudo chown -R orchestrator:orchestrator /opt/insurance-orchestrator
```

### 3.3 Installeer dependencies

```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator npm install
```

### 3.4 Configureer environment variabelen

```bash
sudo -u orchestrator nano /opt/insurance-orchestrator/.env
```

Voeg de volgende inhoud toe (pas aan waar nodig):

```env
# Database
DATABASE_URL="mysql://zyra_user:JouwSterkWachtwoord123!@localhost:3306/zyra_orchestrator"

# Node Environment
NODE_ENV=production

# Optional: Anthropic API Key (als je Claude AI gebruikt)
ANTHROPIC_API_KEY=your_api_key_here
```

### 3.5 Maak .claude directory aan

```bash
sudo -u orchestrator mkdir -p /opt/insurance-orchestrator/.claude
sudo -u orchestrator mkdir -p /opt/insurance-orchestrator/.claude/workflows
```

### 3.6 Setup Prisma database

```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator npx prisma generate
sudo -u orchestrator npx prisma db push
```

### 3.7 Build de applicatie

```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator npm run build
```

## Stap 4: PM2 Setup

### 4.1 Maak PM2 ecosystem bestand

```bash
sudo -u orchestrator nano /opt/insurance-orchestrator/ecosystem.config.js
```

Voeg toe:

```javascript
module.exports = {
  apps: [{
    name: 'insurance-orchestrator',
    script: 'npm',
    args: 'start',
    cwd: '/opt/insurance-orchestrator',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### 4.2 Start applicatie met PM2

```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator pm2 start ecosystem.config.js
sudo -u orchestrator pm2 save

# Setup PM2 om automatisch te starten bij reboot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u orchestrator --hp /opt/insurance-orchestrator
```

### 4.3 Verificeer dat de applicatie draait

```bash
sudo -u orchestrator pm2 status
sudo -u orchestrator pm2 logs insurance-orchestrator
```

## Stap 5: Nginx Reverse Proxy Setup

### 5.1 Maak Nginx configuratie

```bash
sudo nano /etc/nginx/sites-available/insurance-orchestrator
```

Voeg toe:

```nginx
server {
    listen 80;
    listen [::]:80;

    # Vervang met je domein of IP
    server_name jouw-domein.nl;  # of vervang met _ voor elk domein

    # Logs
    access_log /var/log/nginx/insurance-orchestrator-access.log;
    error_log /var/log/nginx/insurance-orchestrator-error.log;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts voor lange werkende processen
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # SSE (Server-Sent Events) support voor workflow streaming
    location /api/projects/execute {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Cache-Control 'no-cache';
        proxy_set_header X-Accel-Buffering 'no';
        proxy_buffering off;
        chunked_transfer_encoding on;
        proxy_read_timeout 3600;
    }

    # Client max body size
    client_max_body_size 50M;
}
```

### 5.2 Enable de site

```bash
# Maak symbolic link
sudo ln -s /etc/nginx/sites-available/insurance-orchestrator /etc/nginx/sites-enabled/

# Test configuratie
sudo nginx -t

# Herstart Nginx
sudo systemctl restart nginx
```

### 5.3 Configureer Firewall

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (voor later, optioneel)
sudo ufw allow 443/tcp

# Allow SSH (als nog niet gedaan)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Stap 6: SSL Setup met Let's Encrypt (Optioneel maar Aanbevolen)

### 6.1 Installeer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Verkrijg SSL certificaat

```bash
# Vervang met je domein
sudo certbot --nginx -d jouw-domein.nl -d www.jouw-domein.nl
```

Certbot zal automatisch je Nginx configuratie aanpassen voor HTTPS.

### 6.3 Test auto-renewal

```bash
sudo certbot renew --dry-run
```

## Stap 7: Verificatie

### 7.1 Test de applicatie

Open je browser en ga naar:
- `http://jouw-ip-adres` of `http://jouw-domein.nl`

Je zou de Insurance Orchestrator interface moeten zien.

### 7.2 Controleer logs

```bash
# PM2 logs
sudo -u orchestrator pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/insurance-orchestrator-access.log
sudo tail -f /var/log/nginx/insurance-orchestrator-error.log
```

## Onderhoud Commando's

### Applicatie herstarten
```bash
sudo -u orchestrator pm2 restart insurance-orchestrator
```

### Applicatie stoppen
```bash
sudo -u orchestrator pm2 stop insurance-orchestrator
```

### Logs bekijken
```bash
sudo -u orchestrator pm2 logs insurance-orchestrator
```

### Status checken
```bash
sudo -u orchestrator pm2 status
```

### Applicatie updaten (na wijzigingen)
```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator git pull  # of upload nieuwe bestanden
sudo -u orchestrator npm install
sudo -u orchestrator npm run build
sudo -u orchestrator pm2 restart insurance-orchestrator
```

### Database backup maken
```bash
mysqldump -u zyra_user -p zyra_orchestrator > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
mysql -u zyra_user -p zyra_orchestrator < backup_20240101.sql
```

## Troubleshooting

### Applicatie start niet
```bash
# Check PM2 logs
sudo -u orchestrator pm2 logs

# Check database connectie
mysql -u zyra_user -p zyra_orchestrator
```

### 502 Bad Gateway
```bash
# Check of applicatie draait
sudo -u orchestrator pm2 status

# Check Nginx configuratie
sudo nginx -t
```

### Database errors
```bash
# Reset Prisma
cd /opt/insurance-orchestrator
sudo -u orchestrator npx prisma generate
sudo -u orchestrator npx prisma db push
```

## Security Best Practices

1. **Wijzig alle default wachtwoorden**
2. **Enable firewall (ufw)**
3. **Gebruik SSL/TLS (Let's Encrypt)**
4. **Reguliere updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
5. **Database backups**: Setup een cronjob voor reguliere backups
6. **Monitor logs**: Check regelmatig logs voor verdachte activiteit
7. **Beperk SSH toegang**: Gebruik key-based authentication

## Automatische Backups (Optioneel)

### Setup cronjob voor dagelijkse database backup

```bash
sudo crontab -e
```

Voeg toe:
```cron
# Dagelijkse database backup om 2:00 AM
0 2 * * * mysqldump -u zyra_user -p'JouwSterkWachtwoord123!' zyra_orchestrator | gzip > /opt/backups/zyra_orchestrator_$(date +\%Y\%m\%d).sql.gz

# Verwijder backups ouder dan 30 dagen
0 3 * * * find /opt/backups -name "zyra_orchestrator_*.sql.gz" -mtime +30 -delete
```

Maak backup directory:
```bash
sudo mkdir -p /opt/backups
sudo chown orchestrator:orchestrator /opt/backups
```

## Support

Voor problemen of vragen, check de logs en documentatie. Bij persistente problemen, controleer de GitHub issues of neem contact op met de maintainer.
