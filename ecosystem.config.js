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
    },
    error_file: '/opt/insurance-orchestrator/logs/pm2-error.log',
    out_file: '/opt/insurance-orchestrator/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
