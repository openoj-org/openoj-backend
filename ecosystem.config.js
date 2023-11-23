module.exports = {
    apps : [{
      name: 'openoj-backend',
      script: 'app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }],
  };
  