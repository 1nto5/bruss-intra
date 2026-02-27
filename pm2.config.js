module.exports = {
  apps: [
    {
      name: 'bruss-intra',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      max_memory_restart: '2G',
      kill_timeout: 5000,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: 5000,
      env: {
        PORT: 80,
        NODE_ENV: 'production',
      },
    },
  ],
};
