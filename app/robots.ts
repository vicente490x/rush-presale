import type { MetadataRoute } from 'next';
import { appEnv } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: appEnv() === 'production' ? ['/admin', '/api', '/conferma', '/anteprima'] : '/' } };
}
