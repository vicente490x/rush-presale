import { NextResponse } from 'next/server';

// Retired: the public storefront no longer requires a shared password.
export async function POST() {
  return NextResponse.json({ error: 'Accesso con password rimosso. Apri la pagina principale.' }, { status: 410 });
}
