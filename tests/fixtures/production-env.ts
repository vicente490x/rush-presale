import type { Environment } from '../../lib/deployment-config';

// Synthetic format fixtures; never sent to a provider.
export function productionFixture(): Environment {
  return {
    APP_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://rush.test-provider.net',
    DATABASE_URL: 'postgresql://audit:fixture@db.test-provider.net/rush_prod?sslmode=require&sslaccept=strict',
    DIRECT_URL: 'postgresql://audit:fixture@direct.test-provider.net/rush_prod?sslmode=require&sslaccept=strict',
    PRODUCTION_DATABASE_CONFIRMED: 'true', PRODUCTION_LAUNCH_CONFIRMED: 'true', LEGAL_REVIEW_CONFIRMED: 'true',
    STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_' + 'A'.repeat(32), STRIPE_WEBHOOK_SECRET: 'whsec_' + 'B'.repeat(32),
    ALLOW_LIVE_PAYMENTS: 'true', ADMIN_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53), SESSION_SECRET: 'c'.repeat(40), CRON_SECRET: 'e'.repeat(40),
    ENABLE_AUTOMATIC_JOBS: 'true', TRYON_REVIEWED: 'false', RESEND_API_KEY: 're_' + 'f'.repeat(32),
    MAIL_FROM: 'RUSH <orders@rush.test-provider.net>', ADMIN_EMAIL: 'admin@rush.test-provider.net',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'fixture-site', TURNSTILE_SECRET_KEY: 'fixture-secret',
    UPSTASH_REDIS_REST_TOKEN: 'fixture-token', UPSTASH_REDIS_REST_URL: 'https://rush.test-provider.net',
    SELLER_NAME: 'Synthetic Seller', SELLER_ADDRESS: 'Synthetic Street 1', SELLER_TAX_ID: 'SYNTHETIC123',
    PRIVACY_EMAIL: 'privacy@rush.test-provider.net', SUPPORT_EMAIL: 'support@rush.test-provider.net',
    WITHDRAWAL_POLICY: 'Synthetic reviewed policy text for isolated automated tests only; no legal statement.'
  };
}

