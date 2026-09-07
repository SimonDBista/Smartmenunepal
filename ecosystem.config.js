module.exports = {
  apps: [
    {
      name: 'advanced-restro',
      script: 'server.js',
      instances: 1, // Single instance required for in-memory Socket.io rooms (unless using Redis adapter)
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
