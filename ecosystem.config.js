module.exports = {
  apps: [
    {
      name: 'darkmine',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/darkmine',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/darkmine-error.log',
      out_file: '/var/log/pm2/darkmine-out.log',
      merge_logs: true,
    },
  ],
};
