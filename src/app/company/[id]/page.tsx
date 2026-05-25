import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata, ResolvingMetadata } from 'next';

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
    const company = await db.user.findUnique({
      where: { id, role: "employer" },
      select: {
        name: true,
        company_description: true,
        company_industry: true,
        city: true,
        state: true,
      },
    });

    if (!company) return { title: 'Company Not Found' };

    const title = `${company.name} Careers and Company Profile | Talorix`;
    const description = `Learn more about ${company.name}${company.company_industry ? ` in the ${company.company_industry} industry` : ''}. ${company.company_description?.substring(0, 150)}... View active job openings on Talorix.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    return { title: 'Company Profile | Talorix' };
  }
}

export default async function CompanyProfile({ params }: { params: Promise<{ id: string }> }) {
    // Await params since Next.js 15 treats params as a Promise
    const { id } = await params;

    const company = await db.user.findUnique({
        where: { id: id, role: "employer" },
        select: {
            id: true,
            name: true,
            company_description: true,
            company_logo_url: true,
            company_size: true,
            company_industry: true,
            company_website: true,
            city: true,
            state: true,
            country: true,
        }
    });

    if (!company) {
        notFound();
    }

    // Fetch active jobs for this company
    const activeJobs = await db.job.findMany({
        where: { posted_by: company.id },
        orderBy: { created_at: "desc" },
        include: { _count: { select: { applications: true } } }
    });

    return (
        <div className="min-h-screen bg-black">
            <main className="pt-24 pb-16 px-6 lg:px-10 max-w-5xl mx-auto">
                {/* Header Profiling */}
                <div className="glass p-8 rounded-3xl border border-border/50 mb-12 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative overflow-hidden">
                    {/* Background blur effect for logo colors */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-muted/40 rounded-full blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                    <div className="relative shrink-0 mt-4 sm:mt-0">
                        <div className="w-32 h-32 rounded-3xl overflow-hidden bg-muted/40 border border-border flex items-center justify-center p-2 shadow-md">
                            {company.company_logo_url ? (
                                <img src={company.company_logo_url} alt={`${company.name} Logo`} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                            ) : (
                                <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-4-4v4h2v-4h-2z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-xl font-extrabold text-white mb-2">{company.name}</h1>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                                    {(company.city || company.state || company.country) && (
                                        <span className="flex items-center text-sm font-medium text-muted-foreground/60 bg-muted/40 px-3 py-1 rounded-full border border-border">
                                            <svg className="w-4 h-4 mr-2 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            {[company.city, company.state, company.country].filter(Boolean).join(", ")}
                                        </span>
                                    )}
                                    {company.company_size && (
                                        <span className="flex items-center text-sm font-medium text-muted-foreground/60 bg-muted/40 px-3 py-1 rounded-full border border-border">
                                            <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                            {company.company_size} Employees
                                        </span>
                                    )}
                                    {company.company_industry && (
                                        <span className="flex items-center text-sm font-medium text-muted-foreground/60 bg-muted/40 px-3 py-1 rounded-full border border-border">
                                            <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            {company.company_industry}
                                        </span>
                                    )}
                                    <span className="flex items-center text-sm font-medium text-muted-foreground/60 bg-muted/40 px-3 py-1 rounded-full border border-border">
                                        <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                        {activeJobs.length} Active Jobs
                                    </span>
                                </div>
                            </div>

                            {company.company_website && (
                                <a
                                    href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-background/5 hover:bg-background/10 border border-white/10 text-white font-medium px-6 py-2.5 rounded-xl transition-colors duration-300 flex items-center justify-center sm:justify-start"
                                >
                                    Visit Website
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Company Overview */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="glass p-8 rounded-3xl border border-border/50">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                                About {company.name}
                            </h2>
                            <div className="prose prose-invert max-w-none text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                                {company.company_description ? (
                                    <p>{company.company_description}</p>
                                ) : (
                                    <p className="italic text-muted-foreground">No company description provided yet.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Open Positions Sidebar */}
                    <div className="lg:col-span-1">
                        <section className="glass rounded-3xl border border-border/50 overflow-hidden sticky top-24">
                            <div className="p-6 border-b border-border/50 bg-background/[0.02]">
                                <h2 className="text-lg font-bold text-white flex items-between justify-between">
                                    Open Positions
                                    <span className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs px-2.5 py-1 rounded-full">{activeJobs.length}</span>
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
                                {activeJobs.length > 0 ? (
                                    activeJobs.map((job) => (
                                        <div key={job.id} className="p-6 hover:bg-background/[0.02] transition-colors duration-300 group">
                                            <h3 className="font-bold text-white mb-1 group-hover:text-[#F59E0B] transition-colors duration-300">
                                                <Link href={`/jobs/${job.id}`}>{job.job_title}</Link>
                                            </h3>
                                            <div className="flex items-center text-xs text-muted-foreground mb-3 font-medium">
                                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                {[job.city, job.state, job.country].filter(Boolean).length > 0
                                                    ? [job.city, job.state, job.country].filter(Boolean).join(", ") + ` (${job.work_model})`
                                                    : `Anywhere (${job.work_model})`}
                                            </div>
                                            <Link href={`/jobs/${job.id}`} className="inline-flex text-sm font-bold text-[#F59E0B] hover:text-[#F59E0B]/80">
                                                View Details →
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        No active job postings at the moment.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
