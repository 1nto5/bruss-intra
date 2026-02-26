module.exports = {
  apps: [
    {
      name: 'bruss-intra',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'bun',
      interpreter_args: '--smol',
      max_memory_restart: '2G',
      env: {
        PORT: 80,
        NODE_ENV: 'production',
      },
    },
  ],
};
