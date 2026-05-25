import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

// Admin middleware helper
async function getAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) {
        console.log("Admin Check: No auth_token found in cookies");
        return null;
    }

    const session = await verifyAuth(token.value);
    if (!session) {
        console.log("Admin Check: JWT Verification failed");
        return null;
    }

    console.log(`Admin Check: Session userId=${session.userId}`);

    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, is_admin: true, email: true },
    });

    if (!user) {
        console.log(`Admin Check: User with ID ${session.userId} not found in DB`);
        return null;
    }

    console.log(`Admin Check: Found user ${user.email}, is_admin=${user.is_admin}`);

    if (!user.is_admin) return null;
    return user;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getTrendLabel(current: number, previous: number) {
    if (previous === 0) {
        return current > 0 ? "+100%" : "+0%";
    }

    const percent = Math.round(((current - previous) / previous) * 100);
    return `${percent >= 0 ? "+" : ""}${percent}%`;
}

// GET /api/admin/stats — Platform statistics
export async function GET() {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const currentWindowStart = new Date(Date.now() - THIRTY_DAYS_MS);
        const previousWindowStart = new Date(Date.now() - THIRTY_DAYS_MS * 2);
        const previousWindow = {
            gte: previousWindowStart,
            lt: currentWindowStart,
        };

        const [
            totalUsers,
            totalCandidates,
            totalEmployers,
            totalJobs,
            activeJobs,
            totalApplications,
            totalReports,
            pendingReports,
            aiInterviewsCompleted,
            activeCompanies,
            recentUsers,
            recentJobs,
            totalPosts,
        ] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { role: "candidate" } }),
            db.user.count({ where: { role: "employer" } }),
            db.job.count(),
            db.job.count({ where: { status: "ACTIVE" } }),
            db.application.count(),
            db.report.count(),
            db.report.count({ where: { status: "pending" } }),
            db.interviewAttempt.count(),
            db.user.count({ where: { role: "employer", is_suspended: false, postedJobs: { some: { status: "ACTIVE" } } } }),
            db.user.findMany({
                take: 10,
                orderBy: { created_at: "desc" },
                select: {
                    id: true, name: true, email: true, role: true,
                    is_verified: true, verified_employer: true, // is_recommended: true, 
                    created_at: true,
                },
            }),
            db.job.findMany({
                take: 10,
                orderBy: { created_at: "desc" },
                select: {
                    id: true, job_title: true, company_name: true,
                    status: true, created_at: true, posted_by: true,
                    _count: { select: { applications: true, reports: true } },
                },
            }),
            db.post.count(),
        ]);

        const [
            currentCandidates,
            previousCandidates,
            currentEmployers,
            previousEmployers,
            currentJobs,
            previousJobs,
            currentInterviews,
            previousInterviews,
            currentPosts,
            previousPosts,
        ] = await Promise.all([
            db.user.count({ where: { role: "candidate", created_at: { gte: currentWindowStart } } }),
            db.user.count({ where: { role: "candidate", created_at: previousWindow } }),
            db.user.count({ where: { role: "employer", created_at: { gte: currentWindowStart } } }),
            db.user.count({ where: { role: "employer", created_at: previousWindow } }),
            db.job.count({ where: { created_at: { gte: currentWindowStart } } }),
            db.job.count({ where: { created_at: previousWindow } }),
            db.interviewAttempt.count({ where: { created_at: { gte: currentWindowStart } } }),
            db.interviewAttempt.count({ where: { created_at: previousWindow } }),
            db.post.count({ where: { created_at: { gte: currentWindowStart } } }),
            db.post.count({ where: { created_at: previousWindow } }),
        ]);

        return NextResponse.json({
            stats: {
                totalUsers,
                totalCandidates,
                totalEmployers,
                totalJobs,
                jobsPosted: totalJobs,
                activeJobs,
                totalApplications,
                totalReports,
                pendingReports,
                aiInterviewsCompleted,
                activeCompanies,
                totalPosts,
                candidateTrend: getTrendLabel(currentCandidates, previousCandidates),
                employerTrend: getTrendLabel(currentEmployers, previousEmployers),
                jobsTrend: getTrendLabel(currentJobs, previousJobs),
                aiInterviewTrend: getTrendLabel(currentInterviews, previousInterviews),
                postsTrend: getTrendLabel(currentPosts, previousPosts),
                platformStatus: "Operational", // Static for now
            },
            recentUsers,
            recentJobs,
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
