import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

test('staging storefront is public while admin stays protected, even with old gate configuration', async () => {
  const previous = { ...process.env };
  Object.assign(process.env, { APP_ENV: 'staging', STAGING_DATABASE_CONFIRMED: 'true', STAGING_PASSWORD_HASH: 'obsolete-hash', STAGING_SESSION_SECRET: 'obsolete-secret' });
  try {
    const { proxy } = await import('../proxy');
    for (const path of ['/', '/presale', '/api/status', '/api/orders', '/api/orders/test-code', '/privacy']) {
      const response = await proxy(new NextRequest('https://rush.test' + path));
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('location'), null, path);
      assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
      assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
      assert.ok(response.headers.get('cache-control')?.includes('no-store'));
    }
    for (const path of ['/admin', '/admin/impostazioni', '/api/admin/settings', '/api/admin/export']) {
      const response = await proxy(new NextRequest('https://rush.test' + path));
      assert.equal(response.status, path.startsWith('/api/') ? 401 : 307, path);
      if (!path.startsWith('/api/')) assert.equal(new URL(response.headers.get('location')!).pathname, '/admin/login');
    }
    const { POST } = await import('../app/api/staging/login/route');
    const retired = await POST();
    assert.equal(retired.status, 410);
    assert.equal(retired.headers.get('set-cookie'), null);
  } finally {
    for (const key of ['APP_ENV', 'STAGING_DATABASE_CONFIRMED', 'STAGING_PASSWORD_HASH', 'STAGING_SESSION_SECRET']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
