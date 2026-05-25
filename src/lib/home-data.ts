import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type HomeOverviewData = {
    aiScore: {
        averageScore: number | null;
        communicationScore: number | null;
        technicalScore: number | null;
        totalAttempts: number;
    };
    shortlistedCandidates: Array<{
        id: string;
        name: string;
        role: string;
        score: number | null;
    }>;
    latestInterview: {
        status: string;
        interviewType: string;
        scheduledTime: string;
        candidateName: string;
        jobTitle: string;
    } | null;
};

export type HomeFeaturedJob = {
    id: string;
    job_title: string;
    company_name: string;
    city: string;
    state: string;
    country: string;
    salary_min: number;
    salary_max: number;
    currency: string;
    job_type: string;
    work_model: string;
};

async function getHomeOverviewDataUncached(): Promise<HomeOverviewData> {
    const [attemptAggregate, shortlistedApplications, latestInterview] = await Promise.all([
        db.interviewAttempt.aggregate({
            _avg: {
                score: true,
                communication_score: true,
                technical_score: true,
            },
            _count: {
                id: true,
            },
        }),
        db.application.findMany({
            where: {
                application_status: "shortlisted",
            },
            orderBy: {
                applied_at: "desc",
            },
            take: 2,
            select: {
                id: true,
                applicant_name: true,
                candidate: {
                    select: {
                        name: true,
                        current_job_title: true,
                        headline: true,
                        interviewAttempts: {
                            select: {
                                score: true,
                            },
                            orderBy: {
                                created_at: "desc",
                            },
                            take: 1,
                        },
                    },
                },
                job: {
                    select: {
                        job_title: true,
                    },
                },
            },
        }),
        db.interview.findFirst({
            orderBy: {
                created_at: "desc",
            },
            select: {
                status: true,
                interview_type: true,
                scheduled_time: true,
                candidate: {
                    select: {
                        name: true,
                    },
                },
                job: {
                    select: {
                        job_title: true,
                    },
                },
            },
        }),
    ]);

    return {
        aiScore: {
            averageScore: attemptAggregate._avg.score !== null ? Number(attemptAggregate._avg.score) : null,
            communicationScore: attemptAggregate._avg.communication_score !== null
                ? Number(attemptAggregate._avg.communication_score) * 2
                : null,
            technicalScore: attemptAggregate._avg.technical_score !== null
                ? Number(attemptAggregate._avg.technical_score) * 2
                : null,
            totalAttempts: attemptAggregate._count.id,
        },
        shortlistedCandidates: shortlistedApplications.map((application) => ({
            id: application.id,
            name: application.applicant_name || application.candidate.name,
            role: application.candidate.current_job_title || application.candidate.headline || application.job.job_title,
            score: application.candidate.interviewAttempts[0]?.score ?? null,
        })),
        latestInterview: latestInterview
            ? {
                status: latestInterview.status,
                interviewType: latestInterview.interview_type,
                scheduledTime: latestInterview.scheduled_time.toISOString(),
                candidateName: latestInterview.candidate.name,
                jobTitle: latestInterview.job.job_title,
            }
            : null,
    };
}

async function getFeaturedJobsUncached(): Promise<HomeFeaturedJob[]> {
    return db.job.findMany({
        where: {
            status: "ACTIVE",
        },
        orderBy: {
            created_at: "desc",
        },
        take: 6,
        select: {
            id: true,
            job_title: true,
            company_name: true,
            city: true,
            state: true,
            country: true,
            salary_min: true,
            salary_max: true,
            currency: true,
            job_type: true,
            work_model: true,
        },
    });
}

export const getCachedHomeOverviewData = unstable_cache(
    getHomeOverviewDataUncached,
    ["home-overview-data"],
    { revalidate: 60 }
);

export const getCachedFeaturedJobs = unstable_cache(
    getFeaturedJobsUncached,
    ["home-featured-jobs"],
    { revalidate: 60 }
);
