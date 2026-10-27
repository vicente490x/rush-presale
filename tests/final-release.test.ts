import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { adminPassword } from '../lib/admin-account';
import { contentSecurityPolicy } from '../lib/security-headers';

test('3D CSP permits WebAssembly without allowing JavaScript eval', () => {
  assert.equal(contentSecurityPolicy('test').includes("'wasm-unsafe-eval'"), true);
  assert.ok(contentSecurityPolicy('test').includes("connect-src 'self' blob:"));
  assert.equal(contentSecurityPolicy('test').includes("'unsafe-eval'"), false);
});

test('ADMIN password policy rejects bcrypt truncation and control characters', () => {
  for (const password of ['short', 'x'.repeat(73), 'è'.repeat(37), 'safe-length-password\n']) {
    assert.equal(adminPassword.safeParse(password).success, false);
  }
  assert.equal(adminPassword.safeParse('è'.repeat(36)).success, true);
});

test('3D GLB is valid v2 and self-contained with embedded textures', () => {
  const glb = readFileSync('public/assets/models/rush-oversized-shirt.glb');
  assert.equal(glb.toString('ascii', 0, 4), 'glTF');
  assert.equal(glb.readUInt32LE(4), 2);
  assert.equal(glb.readUInt32LE(8), glb.length);
  assert.equal(glb.readUInt32LE(16), 0x4e4f534a);
  const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
  assert.ok(gltf.meshes.length > 0);
  assert.ok(gltf.images.length >= 2);
  for (const item of [...gltf.images, ...gltf.buffers]) assert.equal(item.uri, undefined);
  for (const texture of gltf.images) assert.equal(typeof texture.bufferView, 'number');
});
