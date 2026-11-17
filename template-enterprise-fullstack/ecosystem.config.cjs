module.exports = {
  apps: [
    {
      name: 'enterprise-backend',
      script: 'node_modules/.bin/tsx',
      args: 'server/index.ts',
      instances: 1, // ou 'max' se stateless
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
