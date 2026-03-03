require('dotenv').config();

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'SHOPIFY_WEBHOOK_SECRET',
    'SHOPIFY_STORE_DOMAIN',
    'SNOV_CLIENT_ID',
    'SNOV_CLIENT_SECRET',
    'SNOV_LIST_ABANDONED',
    'SNOV_LIST_UPSELL',
    'SNOV_LIST_WELCOME',
    'SNOV_DNE_WELCOME',
    'SNOV_DNE_UPSELL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  Some features may not work correctly.');
  }
}

const config = {
  port: process.env.PORT || 3000,

  shopify: {
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
  },

  snov: {
    clientId: process.env.SNOV_CLIENT_ID,
    clientSecret: process.env.SNOV_CLIENT_SECRET,
    lists: {
      abandoned: process.env.SNOV_LIST_ABANDONED,
      upsell: process.env.SNOV_LIST_UPSELL,
      welcome: process.env.SNOV_LIST_WELCOME,
      dneWelcome: process.env.SNOV_DNE_WELCOME,
      dneUpsell: process.env.SNOV_DNE_UPSELL
    },
    mock: process.env.MOCK_SNOV === 'true'
  },

  abandonedCart: {
    thresholdMinutes: 2
  }
};

module.exports = { config, validateEnv };
