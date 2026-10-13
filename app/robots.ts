import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicConfig().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin', '/api/cron'] }],
    host: baseUrl
  };
}
