import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.WEBHOOK_PORT || process.env.PORT || 8090),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  wpSiteUrl: process.env.WP_SITE_URL || 'http://localhost:8080',
  mysql: {
    host: process.env.MYSQL_HOST || 'mysql',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'motorcycle_user',
    password: process.env.MYSQL_PASSWORD || 'motorcycle_pass',
    database: process.env.MYSQL_DATABASE || 'motorcycle_marketplace'
  },
  crm: {
    defaultManagerEmail: process.env.CRM_DEFAULT_MANAGER_EMAIL || 'manager@example.com'
  }
};

export default config;
