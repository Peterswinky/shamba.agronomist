require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    // Fail fast at boot rather than mysteriously later.
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'src/uploads',
  DISEASE_MODEL_PROVIDER: process.env.DISEASE_MODEL_PROVIDER || 'mock', // 'mock' | 'plantid' | 'custom'
  PLANT_ID_API_KEY: process.env.PLANT_ID_API_KEY || '',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),

  // M-Pesa (Safaricom Daraja API) — used for the listing-boost payment feature.
  MPESA_ENV: process.env.MPESA_ENV || 'sandbox', // 'sandbox' | 'production'
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || '',
  MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || '',
  MPESA_SHORTCODE: process.env.MPESA_SHORTCODE || '',
  MPESA_PASSKEY: process.env.MPESA_PASSKEY || '',
  MPESA_CALLBACK_URL: process.env.MPESA_CALLBACK_URL || '', // must be a publicly reachable HTTPS URL

  // Africa's Talking USSD — no outbound API key needed for inbound webhook handling;
  // this is only required if we later call back into the AT API (e.g. sending SMS).
  AFRICASTALKING_USSD_CODE: process.env.AFRICASTALKING_USSD_CODE || '*384*#',
};
