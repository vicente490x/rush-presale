import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { uploadTemporaryAsset, deleteTemporaryAsset } from '@/lib/storage';
import { createTryOnProvider } from '@/lib/tryon-provider';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 120;

const consentSchema = z.object({ consent: z.literal('true'), adult: z.literal('true'), turnstileToken: z.string().min(1) });
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageMagic = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxResultBytes = 12 * 1024 * 1024;

async function fetchProviderImage(imageUrl: string) {
  let url = new URL(imageUrl);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.fal.media') || url.username || url.password) {
      throw new Error('URL immagine del provider non valida.');
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
      redirect: 'manual'
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('Reindirizzamento immagine del provider non valido.');
    url = new URL(location, url);
  }
  throw new Error('Troppi reindirizzamenti per l’immagine del provider.');
}

async function readLimitedImage(response: Response) {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxResultBytes) throw new Error('Immagine generata troppo grande.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Risposta immagine vuota.');
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxResultBytes) {
      await reader.cancel();
      throw new Error('Immagine generata troppo grande.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  let sourcePath: string | undefined;
  let jobId: string | undefined;
  let reservedCost = 0;
  let providerStarted = false;
  let reservationDay: Date | undefined;
  const startedAt = Date.now();

  try {
    const rate = await enforceRateLimit(ip, 'tryon', 5, '1 h');
    if (!rate.success) return NextResponse.json({ error: 'Hai raggiunto il limite di 5 prove in un’ora.' }, { status: 429 });
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > 9 * 1024 * 1024) {
      return NextResponse.json({ error: 'La richiesta supera la dimensione massima consentita.' }, { status: 413 });
    }

    const form = await request.formData();
    const consent = consentSchema.safeParse({
      consent: form.get('consent'),
      adult: form.get('adult'),
      turnstileToken: form.get('turnstileToken')
    });
    if (!consent.success) return NextResponse.json({ error: 'Conferma di avere almeno 18 anni e accetta il trattamento della foto.' }, { status: 400 });
    if (!await verifyTurnstile(consent.data.turnstileToken, ip)) {
      return NextResponse.json({ error: 'Completa la verifica anti-bot.' }, { status: 400 });
    }

    const file = form.get('photo');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Carica una foto JPG, PNG o WEBP.' }, { status: 400 });
    if (file.size === 0 || file.size > 8 * 1024 * 1024 || !allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'La foto deve essere JPG, PNG o WEBP e non superare 8 MB.' }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(raw);
    if (!detected || !imageMagic.has(detected.mime) || detected.mime !== file.type) {
      return NextResponse.json({ error: 'Il contenuto del file non corrisponde a un’immagine JPG, PNG o WEBP valida.' }, { status: 400 });
    }

    const current = await prisma.settings.upsert({
      where: { id: 'global' },
      create: { id: 'global', tryOnDailyLimit: Number(process.env.TRYON_DAILY_LIMIT ?? 50) },
      update: {}
    });
    if (!current.tryOnEnabled) return NextResponse.json({ error: 'La prova virtuale non è al momento disponibile.' }, { status: 503 });
    const storageConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) || process.env.TRYON_PROVIDER_MODE === 'mock';
    if (!storageConfigured) return NextResponse.json({ error: 'Il servizio prova virtuale non è configurato.' }, { status: 503 });

    const maxSpend = Number(process.env.TRYON_MAX_DAILY_SPEND_USD ?? 5);
    const cost = Number(process.env.TRYON_COST_ESTIMATE_USD ?? 0.075);
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(maxSpend) || maxSpend <= 0) {
      throw new Error('Configurazione budget try-on non valida.');
    }
    reservedCost = cost * 2;
    const spendReset = new Date();
    spendReset.setUTCHours(0, 0, 0, 0);
    reservationDay = spendReset;
    const job = await prisma.$transaction(async (tx) => {
      await tx.settings.updateMany({
        where: { id: 'global', tryOnSpendResetAt: { lt: spendReset } },
        data: { tryOnDailyCount: 0, tryOnDailySpendUsd: 0, tryOnSpendResetAt: spendReset }
      });
      const latest = await tx.settings.findUniqueOrThrow({ where: { id: 'global' } });

      const locked = await tx.settings.updateMany({
        where: {
          id: 'global',
          tryOnDailyCount: { lt: latest.tryOnDailyLimit },
          tryOnDailySpendUsd: { lte: maxSpend - reservedCost },
          tryOnSpendResetAt: { gte: spendReset }
        },
        data: {
          tryOnDailyCount: { increment: 1 },
          tryOnDailySpendUsd: { increment: reservedCost },
          tryOnSpendResetAt: spendReset
        }
      });
      if (locked.count !== 1) throw new Error('È stato raggiunto il limite giornaliero di prove virtuali o di spesa.');
      return tx.tryOnJob.create({
        data: {
          status: 'PROCESSING',
          provider: process.env.TRYON_MODEL_ID ?? 'fal-ai/fashn/tryon',
          costEstimate: reservedCost,
          isTest: process.env.APP_ENV !== 'production' && process.env.TRYON_PROVIDER_MODE === 'mock'
        }
      });
    });
    jobId = job.id;

    const normalized = await sharp(raw, { failOn: 'error' }).rotate().resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    sourcePath = `input/${randomUUID()}.jpg`;
    const sourceUrl = await uploadTemporaryAsset(sourcePath, normalized, 'image/jpeg', new Date(Date.now() + 10 * 60_000));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error('URL pubblico non configurato.');
    const garmentUrl = `${siteUrl.replace(/\/$/, '')}/assets/mockup-fronte.png`;
    const provider = createTryOnProvider();
    providerStarted = true;
    const generated = await provider.generate(sourceUrl, garmentUrl);
    const generatedUrl = generated.imageUrl;
    const actualCost = cost * generated.attempts;
    if (actualCost < reservedCost) {
      const release = reservedCost - actualCost;
      await prisma.$transaction([
        prisma.settings.updateMany({
          where: { id: 'global', tryOnSpendResetAt: reservationDay },
          data: { tryOnDailySpendUsd: { decrement: release } }
        }),
        prisma.tryOnJob.update({ where: { id: job.id }, data: { costEstimate: actualCost } })
      ]);
      reservedCost = actualCost;
    }
    const generatedResponse = await fetchProviderImage(generatedUrl);
    if (!generatedResponse.ok) throw new Error(`Download risultato try-on non riuscito (${generatedResponse.status}).`);
    const output = await readLimitedImage(generatedResponse);
    const outputType = await fileTypeFromBuffer(output);
    if (!outputType || !imageMagic.has(outputType.mime)) throw new Error('Il provider ha restituito un formato immagine non valido.');

    await deleteTemporaryAsset(sourcePath);
    sourcePath = undefined;
    const result = await sharp(output, { failOn: 'error' })
      .rotate()
      .resize({ width: 1400, height: 1800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await prisma.tryOnJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', durationMs: Date.now() - startedAt } });
    return NextResponse.json({
      imageDataUrl: `data:image/webp;base64,${result.toString('base64')}`,
      expiresAt: new Date(Date.now() + Number(process.env.TRYON_RESULT_TTL_SECONDS ?? 300) * 1000).toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Prova virtuale non riuscita.';
    if (jobId) {
      await prisma.$transaction(async (tx) => {
        await tx.tryOnJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', durationMs: Date.now() - startedAt, ...(providerStarted ? {} : { costEstimate: 0 }) }
        });
        if (!providerStarted && reservedCost > 0) {
          await tx.settings.updateMany({
            where: { id: 'global', tryOnSpendResetAt: reservationDay },
            data: { tryOnDailyCount: { decrement: 1 }, tryOnDailySpendUsd: { decrement: reservedCost } }
          });
        }
      }).catch((updateError: unknown) => logError('tryon.stats.update.failed', updateError));
      if (!providerStarted) {
        reservedCost = 0;
      }
    }
    logError('tryon.generation.failed', error);
    const status = /limite giornaliero/.test(message) ? 429 : 502;
    return NextResponse.json({
      error: status === 429 ? message : 'Non è stato possibile generare l’anteprima. Prova un’altra foto o continua senza la prova virtuale.'
    }, { status });
  } finally {
    if (sourcePath) await deleteTemporaryAsset(sourcePath).catch((error: unknown) => logError('tryon.input.cleanup.failed', error));
  }
}
