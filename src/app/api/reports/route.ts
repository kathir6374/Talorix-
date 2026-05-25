import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { jobId, reason, description } = await req.json();

        if (!jobId || !reason) {
            return NextResponse.json({ error: "Job ID and reason are required" }, { status: 400 });
        }

        const validReasons = [
            "spam",
            "misleading",
            "scam",
            "inappropriate",
            "duplicate",
            "expired",
            "other",
        ];

        if (!validReasons.includes(reason)) {
            return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
        }

        // Check job exists
        const job = await db.job.findUnique({ where: { id: jobId } });
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Check duplicate report
        const legacyExistingReport = await db.report.findFirst({
            where: { user_id: session.userId, job_id: jobId },
        });

        if (legacyExistingReport) {
            return NextResponse.json({ error: "You have already reported this job" }, { status: 409 });
        }

        const report = await db.report.create({
            data: {
                user_id: session.userId,
                job_id: jobId,
                reason,
                description: description || null,
            },
        });

        return NextResponse.json({ message: "Report submitted successfully", report }, { status: 201 });
    } catch (error) {
        console.error("Report error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
