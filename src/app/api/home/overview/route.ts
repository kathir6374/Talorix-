import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
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

        return NextResponse.json({
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
        });
    } catch (error) {
        console.error("Home overview data error:", error);
        return NextResponse.json({ error: "Failed to load home overview data." }, { status: 500 });
    }
}
