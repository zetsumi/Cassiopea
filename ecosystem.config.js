module.exports = {
  apps : [{
    name: 'Cassiopeia',
    script: 'server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'dev'
    },
    env_production: {
      NODE_ENV: 'dev'
    }
  }]
};
