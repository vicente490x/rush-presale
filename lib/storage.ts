import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

let storage: ReturnType<typeof createClient> | undefined;

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Storage temporaneo non configurato.');
  storage ??= createClient(url, key, { auth: { persistSession: false } });
  return storage;
}

async function writeLocalTemporaryAsset(path: string, body: Buffer) {
  const root = join(process.cwd(), '.tmp-tryon');
  const absolutePath = join(root, path.replace(/^\//, ''));
  await fs.mkdir(absolutePath.split('/').slice(0, -1).join('/'), { recursive: true });
  await fs.writeFile(absolutePath, body);
  return absolutePath;
}

export async function uploadTemporaryAsset(path: string, body: Buffer, contentType: string, expiresAt: Date) {
  if (process.env.TRYON_PROVIDER_MODE === 'mock' || (!process.env.SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    const absolutePath = await writeLocalTemporaryAsset(path, body);
    await (await import('@/lib/prisma')).prisma.temporaryTryOnAsset.create({ data: { path: absolutePath, expiresAt } });
    return absolutePath;
  }
  const bucket = process.env.TRYON_BUCKET ?? 'rush-tryon-temp';
  const client = supabase();
  const { error: uploadError } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
    cacheControl: '60'
  });
  if (uploadError) throw new Error(`Upload temporaneo non riuscito: ${uploadError.message}`);

  await (await import('@/lib/prisma')).prisma.temporaryTryOnAsset.create({ data: { path, expiresAt } });
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data.signedUrl) throw new Error(`URL temporaneo non disponibile: ${error?.message ?? 'errore storage'}`);
  return data.signedUrl;
}

export async function deleteTemporaryAsset(path: string) {
  if (process.env.TRYON_PROVIDER_MODE === 'mock' || (!process.env.SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    await fs.rm(path, { force: true });
    const { prisma } = await import('@/lib/prisma');
    await prisma.temporaryTryOnAsset.deleteMany({ where: { path } });
    return;
  }
  const bucket = process.env.TRYON_BUCKET ?? 'rush-tryon-temp';
  const { error } = await supabase().storage.from(bucket).remove([path]);
  if (error) throw new Error(`Eliminazione immagine temporanea non riuscita: ${error.message}`);
  const { prisma } = await import('@/lib/prisma');
  await prisma.temporaryTryOnAsset.deleteMany({ where: { path } });
}

export async function removeExpiredAssets(now = new Date()) {
  const { prisma } = await import('@/lib/prisma');
  const expired = await prisma.temporaryTryOnAsset.findMany({ where: { expiresAt: { lte: now } }, take: 100 });
  let removed = 0;
  for (const asset of expired) {
    await deleteTemporaryAsset(asset.path);
    removed++;
  }
  return removed;
}
