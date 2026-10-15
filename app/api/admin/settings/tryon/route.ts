import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isMockRuntime } from '@/lib/mock-runtime';

const schema = z.object({ enabled: z.boolean(), dailyLimit: z.number().int().min(0).max(1000) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Impostazioni prova virtuale non valide.' }, { status: 400 });
  if (parsed.data.enabled && !(isMockRuntime() && process.env.TRYON_PROVIDER === 'mock') && (
    !process.env.FAL_KEY ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.TURNSTILE_SECRET_KEY ||
    !process.env.UPSTASH_REDIS_REST_URL
  )) {
    return NextResponse.json({ error: 'Configura provider, storage, Turnstile e rate limiting prima di attivare la prova virtuale.' }, { status: 409 });
  }
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: { id: 'global', tryOnEnabled: parsed.data.enabled, tryOnDailyLimit: parsed.data.dailyLimit },
    update: { tryOnEnabled: parsed.data.enabled, tryOnDailyLimit: parsed.data.dailyLimit }
  });
  return NextResponse.json({ ok: true });
}
