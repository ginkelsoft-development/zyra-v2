# Insurance Orchestrator

Een krachtige workflow orchestrator voor het automatiseren van development workflows met AI agents en externe services.

## ✨ Features

- 🎯 **Visual Workflow Builder** - Drag & drop workflow editor met React Flow
- 🤖 **AI Agents** - Integratie met Claude AI agents
- 🔗 **Service Integratie** - GitHub, Slack, Email, Jira, en meer
- 📊 **Real-time Execution** - Stream workflow execution logs
- 🗄️ **Database Backed** - MySQL database voor configuratie en history
- 🔐 **Multi-tenant** - Ondersteuning voor meerdere projecten
- 📈 **Execution History** - Track alle workflow executions

## 🚀 Quick Start

### Lokale Development

```bash
# Clone repository
git clone <repo-url>
cd insurance-orchestrator

# Installeer dependencies
npm install

# Setup database
npm run prisma:generate
npm run prisma:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### VPS Deployment

Voor production deployment op een Ubuntu 24 VPS:

```bash
# 1. Upload bestanden
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@vps-ip:/tmp/insurance-orchestrator/

# 2. SSH naar VPS en run deployment
ssh user@vps-ip
sudo cp /tmp/insurance-orchestrator/deploy.sh /root/
sudo /root/deploy.sh
```

Zie **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** voor complete instructies.

## 📚 Documentatie

### Setup & Deployment

- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Complete setup guide (CLI tools + Deployment + Services)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Gedetailleerde deployment instructies
- **[QUICKSTART-VPS.md](./QUICKSTART-VPS.md)** - Snelle deployment guide

### Scripts

- **[setup-cli-tools.sh](./setup-cli-tools.sh)** - Installeer GitHub CLI, Claude Code CLI, Jira CLI, Docker
- **[configure-services.sh](./configure-services.sh)** - Configureer service categories (GitHub, Slack, Email, etc.)
- **[deploy.sh](./deploy.sh)** - Automatische deployment naar VPS

## 🏗️ Tech Stack

- **Frontend:** Next.js 14, React, TailwindCSS, React Flow
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** MySQL
- **AI:** Anthropic Claude API
- **Process Manager:** PM2
- **Web Server:** Nginx
- **CLI Tools:** GitHub CLI, Claude Code CLI, Jira CLI

## 📋 Vereisten

### Development
- Node.js 20+
- MySQL 8+
- npm or yarn

### Production (VPS)
- Ubuntu 24.04 LTS (aanbevolen)
- 2GB+ RAM
- 20GB+ storage
- Root/sudo toegang

## 🔧 Project Structuur

```
insurance-orchestrator/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   ├── projects/            # Project pages
│   └── workflows/           # Workflow pages
├── components/              # React components
│   ├── workflow/           # Workflow builder components
│   └── ui/                 # UI components
├── lib/                     # Utility libraries
│   ├── services/           # Service managers
│   └── db/                 # Database utilities
├── prisma/                  # Prisma schema en migrations
│   └── schema.prisma       # Database schema
├── public/                  # Static assets
├── scripts/                 # Utility scripts
├── deploy.sh               # Deployment script
├── setup-cli-tools.sh      # CLI tools setup
├── configure-services.sh   # Services configuratie
└── ecosystem.config.js     # PM2 configuratie
```

## 🎯 Gebruik

### 1. Maak een Project

```bash
# Via UI
http://localhost:3000/projects
# Klik "New Project" en voer project details in
```

### 2. Configureer Services

**Optie A: Via configuratie script (Production)**
```bash
./configure-services.sh
```

**Optie B: Via UI (Development/Production)**
1. Ga naar "Service Categories"
2. Configureer GitHub, Slack, Email, etc.
3. Sla configuratie op

### 3. Bouw een Workflow

1. Ga naar je project
2. Klik "New Workflow"
3. Drag & drop services en agents
4. Configureer elke node
5. Verbind nodes met edges
6. Voeg condities toe
7. Sla workflow op

### 4. Voer Workflow uit

1. Open workflow
2. Klik "Execute Workflow"
3. Bekijk real-time logs
4. Check execution history

## 🤖 Beschikbare Services

### GitHub Services
- **GitHub Issues** - Fetch en filter issues
- **GitHub Branch Manager** - Create en manage branches
- **GitHub Commit** - Commit changes
- **GitHub PR Creator** - Create pull requests
- **GitHub Issue Updater** - Update issue status

### Notification Services
- **Slack Notifier** - Send Slack messages
- **Email Notifier** - Send emails
- **Teams Notifier** - Send Teams messages

### AI Agents
- **Code Reviewer** - Review code quality
- **Bug Fixer** - Fix bugs automatically
- **Feature Developer** - Develop new features
- **Test Runner** - Run tests
- **Security Auditor** - Security analysis

## ⚙️ Configuratie

### Environment Variabelen

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/zyra_orchestrator"

# Node Environment
NODE_ENV=production

# Anthropic (optioneel)
ANTHROPIC_API_KEY=sk-ant-...
```

### Service Categories

Configureer via `configure-services.sh` of via de UI:

**GitHub:**
- owner: GitHub username/organization
- repo: Repository naam
- default_branch: Default branch (main/master)

**Slack:**
- webhook_url: Incoming webhook URL
- default_channel: Default Slack channel
- bot_name: Bot display naam

**Email:**
- smtp_host: SMTP server
- smtp_port: SMTP port
- smtp_user: SMTP username
- smtp_password: SMTP password
- from_email: From email address
- from_name: From name

## 🔒 Security

- Alle passwords worden encrypted opgeslagen
- API keys worden niet gelogd
- SSL/TLS ondersteuning via Let's Encrypt
- CORS configuratie
- Rate limiting (TODO)

## 📊 Monitoring

```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs insurance-orchestrator

# Status
pm2 status

# Nginx logs
tail -f /var/log/nginx/insurance-orchestrator-access.log
```

## 🐛 Troubleshooting

### Applicatie start niet
```bash
pm2 logs insurance-orchestrator
```

### Database errors
```bash
npx prisma generate
npx prisma db push
```

### 502 Bad Gateway
```bash
pm2 status
sudo nginx -t
sudo systemctl restart nginx
```

Zie [DEPLOYMENT.md](./DEPLOYMENT.md) voor meer troubleshooting tips.

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je changes (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📝 License

Dit project is licensed onder de MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [React Flow](https://reactflow.dev/)
- [Anthropic Claude](https://www.anthropic.com/)
- [Prisma](https://www.prisma.io/)
- [TailwindCSS](https://tailwindcss.com/)

## 📧 Contact

Voor vragen en support, open een issue op GitHub.

---

Made with ❤️ for automating development workflows
