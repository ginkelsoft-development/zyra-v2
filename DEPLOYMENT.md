# Deployment Guide

## Automatische Deployment via GitHub Actions

### Setup (eenmalig)

1. **SSH Key genereren op je server**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions"
   cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/id_ed25519  # Kopieer deze private key
   ```

2. **GitHub Secrets configureren**
   Ga naar je repository → Settings → Secrets and variables → Actions

   Voeg de volgende secrets toe:
   - `VPS_HOST`: Je server IP of hostname (bijv. `123.45.67.89`)
   - `VPS_USERNAME`: SSH gebruikersnaam (bijv. `root` of `deploy`)
   - `VPS_SSH_KEY`: De private key die je net hebt gekopieerd
   - `VPS_PORT`: SSH poort (standaard `22`, optioneel)

3. **Applicatie directory op server**
   ```bash
   sudo mkdir -p /var/www
   cd /var/www
   git clone https://github.com/ginkelsoft-development/zyra-v2.git
   cd zyra-v2
   npm install
   ```

4. **PM2 installeren (aanbevolen)**
   ```bash
   npm install -g pm2
   pm2 start npm --name zyra-v2 -- start
   pm2 startup
   pm2 save
   ```

### Gebruik

**Automatisch**: Push naar de \`main\` branch
```bash
git push origin main
```

**Handmatig via GitHub**: Actions tab → Deploy to VPS → Run workflow

## Handmatige Deployment

```bash
cd /var/www/zyra-v2
bash deploy-server.sh
```

## Troubleshooting

### Check logs
```bash
pm2 logs zyra-v2
```

### Rollback
```bash
git reset --hard <commit-hash>
bash deploy-server.sh
```
