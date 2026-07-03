# Database
DATABASE_URL="postgresql://shamba:shamba_password@localhost:5432/shamba_db?schema=public"

# Auth
JWT_SECRET="replace-with-a-long-random-string-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"

# Uploads (swap to S3-compatible bucket config in production)
UPLOAD_DIR="src/uploads"

# Disease checker inference provider: mock | plantid | custom
DISEASE_MODEL_PROVIDER="mock"
PLANT_ID_API_KEY=""

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# M-Pesa (Safaricom Daraja API) — powers the paid "boost listing" feature.
# Get sandbox credentials at https://developer.safaricom.co.ke
MPESA_ENV="sandbox"
MPESA_CONSUMER_KEY=""
MPESA_CONSUMER_SECRET=""
MPESA_SHORTCODE="174379"
MPESA_PASSKEY=""
MPESA_CALLBACK_URL="https://your-public-api-domain.com/api/payments/mpesa/callback"

# Africa's Talking USSD short code (informational; the webhook itself needs no key)
AFRICASTALKING_USSD_CODE="*384*#"
