import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  agentRules: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
    localPatterns: ['/assets/logo.png', '/assets/mockup-fronte.png', '/assets/mockup-retro.png'].map(pathname => ({ pathname, search: '' }))
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
      ]
    }];
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap']
  }
};

export default nextConfig;
