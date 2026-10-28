import { stagingProblems } from '../lib/deployment-config';

// Explicit guard for the existing public TEST deployment. This is not the LIVE
// build command. Endpoint IDs are public routing identifiers, never credentials.
const stagingHosts = [
  'ep-sparkling-shape-b4ke4md1.c-6.us-east-2.aws.neon.tech',
  'ep-sparkling-shape-b4ke4md1-pooler.c-6.us-east-2.aws.neon.tech'
];
try {
  const env = process.env;
  const problems = stagingProblems(env);
  if (problems.length) throw new Error();
  const runtime = new URL(env.DATABASE_URL!);
  const direct = new URL(env.DIRECT_URL!);
  if (runtime.username !== 'rush_staging_app' || !stagingHosts.includes(runtime.hostname) ||
      direct.hostname !== stagingHosts[0] || runtime.pathname !== '/neondb' || direct.pathname !== '/neondb' ||
      env.NEXT_PUBLIC_SITE_URL !== 'https://rush-presale.vercel.app') throw new Error();
  console.log('RUSH_STAGING_DEPLOY_GUARD_PASS: TEST, expected staging endpoint and limited runtime role.');
} catch {
  // Never print URL parser errors, environment values or credentials.
  console.error('RUSH_STAGING_DEPLOY_GUARD_FAILED: verify the explicit staging configuration and target.');
  process.exitCode = 1;
}
