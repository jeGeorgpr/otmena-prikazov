module.exports = {
  apps: [{
    name: 'imyrist',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_URL: 'https://imyrist.ru',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      TBANK_TERMINAL_KEY: '1749156878739',
      TBANK_SECRET_KEY: 'dkOUcD8!h$29QOdf',
      TBANK_NOTIFICATION_URL: 'https://imyrist.ru/api/payments/webhook'
    }
  }]
}
