import { MetadataRoute } from 'next';
import { getAppBaseUrl } from '@/lib/app-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppBaseUrl();
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/candidate-dashboard/',
        '/employer-dashboard/',
        '/admin/',
        '/api/',
        '/verify',
        '/forgot-password',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
