import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

async function getAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) return null;
    const session = await verifyAuth(token.value);
    if (!session) return null;
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, is_admin: true },
    });
    if (!user?.is_admin) return null;
    return user;
}

export async function GET(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";

        const where: any = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { job_title: { contains: search, mode: "insensitive" } },
                { company_name: { contains: search, mode: "insensitive" } },
            ];
        }

        const jobs = await db.job.findMany({
            where,
            include: {
                employer: {
                    select: { name: true, email: true, is_suspended: true }
                },
                _count: {
                    select: { applications: true, reports: true }
                }
            },
            orderBy: { created_at: "desc" },
        });

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error("Admin jobs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { jobId, action } = await req.json();
        if (!jobId || !action) {
            return NextResponse.json({ error: "jobId and action are required" }, { status: 400 });
        }

        const validActions = ["approve", "hide", "close", "delete"];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const existingJob = await db.job.findUnique({
            where: { id: jobId },
            select: { id: true },
        });
        if (!existingJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (action === "delete") {
            await db.$transaction([
                db.bookmark.deleteMany({ where: { job_id: jobId } }),
                db.interview.deleteMany({ where: { job_id: jobId } }),
                db.interviewAttempt.updateMany({ where: { job_id: jobId }, data: { job_id: null } }),
                db.application.deleteMany({ where: { job_id: jobId } }),
                db.report.updateMany({ where: { job_id: jobId }, data: { job_id: null, status: "resolved" } }),
                db.job.delete({ where: { id: jobId } }),
            ]);
            return NextResponse.json({ message: "Job deleted" });
        }

        let status = "ACTIVE";
        if (action === "approve") status = "ACTIVE";
        if (action === "hide") status = "PAUSED";
        if (action === "close") status = "CLOSED";

        const updated = await db.job.update({
            where: { id: jobId },
            data: { status },
        });

        return NextResponse.json({ message: "Job updated", job: updated });
    } catch (error) {
        console.error("Admin job update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
