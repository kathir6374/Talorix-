import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const applications = await db.application.findMany({
            where: {
                candidate_id: session.userId,
                job: {
                    employer: {
                        is_suspended: false
                    }
                }
            },
            include: { 
                job: {
                    include: {
                        employer: {
                            select: {
                                company_logo_url: true,
                                avatar_url: true,
                            }
                        }
                    }
                } 
            },
            orderBy: { applied_at: "desc" },
        });

        const attempts = await db.interviewAttempt.groupBy({
            by: ['job_id'],
            where: {
                user_id: session.userId,
                job_id: { in: applications.map(a => a.job_id) }
            },
            _count: {
                job_id: true
            }
        });

        const attemptsMap = new Map(attempts.map(a => [a.job_id, a._count.job_id]));
        const activeInterviews = await db.interview.findMany({
            where: {
                candidate_id: session.userId,
                job_id: { in: applications.map(a => a.job_id) },
                status: { in: ["Scheduled", "Cancelled"] },
                meeting_link: { not: "" },
                scheduled_time: { gte: new Date() },
            },
            select: {
                id: true,
                job_id: true,
                scheduled_time: true,
                meeting_link: true,
                interview_type: true,
                status: true,
            },
            orderBy: { scheduled_time: "asc" },
        });
        const activeInterviewMap = new Map<string, typeof activeInterviews[number]>();
        activeInterviews.forEach((interview) => {
            if (!activeInterviewMap.has(interview.job_id)) {
                activeInterviewMap.set(interview.job_id, interview);
            }
        });

        const enrichedApplications = applications.map(app => ({
            ...app,
            attemptsCount: attemptsMap.get(app.job_id) || 0,
            pendingAttempts: Math.max(0, 4 - (attemptsMap.get(app.job_id) || 0)),
            activeInterview: activeInterviewMap.get(app.job_id) || null,
        }));

        const attemptsThisWeek = await db.interviewAttempt.count({
            where: {
                user_id: session.userId,
                job_id: null,
                created_at: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const recommendAttemptsLeft = Math.max(0, 1 - attemptsThisWeek);

        return NextResponse.json({ applications: enrichedApplications, recommendAttemptsLeft });
    } catch (error) {
        console.error("Applications GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
