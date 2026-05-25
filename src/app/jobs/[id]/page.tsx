import { Metadata, ResolvingMetadata } from 'next';
import { db as prisma } from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        job_title: true,
        company_name: true,
        job_description: true,
        city: true,
        state: true,
        job_category: true,
      },
    });

    if (!job) return { title: 'Job Not Found' };

    const title = `${job.job_title} at ${job.company_name} | Talorix`;
    const description = `${job.job_title} role in ${job.city}, ${job.state}. ${job.job_description.substring(0, 150)}... Apply now on Talorix, the AI-powered hiring platform.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: new Date().toISOString(),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    return { title: 'Job Opportunity | Talorix' };
  }
}

import JobDetailsClient from './JobDetailsClient';

export default async function JobDetailsPage({ params }: Props) {
  const resolvedParams = await params;
  return <JobDetailsClient id={resolvedParams.id} />;
}
