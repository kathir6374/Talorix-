import { MetadataRoute } from 'next';
import { db as prisma } from '@/lib/db';
import { getAppBaseUrl } from '@/lib/app-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppBaseUrl();

  // Base pages
  const staticPages = [
    '',
    '/jobs',
    '/community',
    '/companies',
    '/login',
    '/signup',
    '/privacy',
    '/terms',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    // Dynamic Job pages
    const jobs = await prisma.job.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, created_at: true },
    });

    const jobPages = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: job.created_at,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Dynamic Company pages
    const companies = await prisma.user.findMany({
      where: { role: 'employer' },
      select: { id: true, created_at: true },
    });

    const companyPages = companies.map((company) => ({
      url: `${baseUrl}/company/${company.id}`,
      lastModified: company.created_at,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...jobPages, ...companyPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
