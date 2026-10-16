import { NextResponse } from 'next/server';
import { adminIdentity, cookieName } from '@/lib/admin-auth';
import { DomainError, logError } from '@/lib/errors';
import { publicConfig } from '@/lib/config';
export function cookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1);
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(publicConfig().NEXT_PUBLIC_SITE_URL).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new DomainError('Origine della richiesta non autorizzata.', 403);
}
export async function readJson(request: Request, maxBytes = 32768) {
  const bytes = await readBytes(request, maxBytes);
  try { return JSON.parse(bytes.toString('utf8')) as unknown; } catch { throw new DomainError('JSON non valido.', 400); }
}
export async function readBytes(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max) throw new DomainError('Richiesta troppo grande.', 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new DomainError('Richiesta troppo grande.', 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function requireAdmin(request: Request) {
  const actor = await adminIdentity(cookie(request, cookieName));
  if (!actor) throw new DomainError('Autenticazione richiesta.', 401);
  if (!['GET', 'HEAD'].includes(request.method)) assertSameOrigin(request);
  return actor;
}
export function adminRoute<C>(handler: (request: Request, context: C, actor: string) => Promise<Response>) {
  return async (request: Request, context: C) => {
    try {
      const response = await handler(request, context, await requireAdmin(request));
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof Error && error.name === 'ZodError') return NextResponse.json({ error: 'Dati non validi. Verifica i campi inseriti.' }, { status: 400 });
      await logError('ADMIN_OPERATION_FAILED');
      return NextResponse.json({ error: 'Operazione non disponibile. Consulta la diagnostica.' }, { status: 503 });
    }
  };
}
