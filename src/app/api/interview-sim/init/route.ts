import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { jobId, role } = body;

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? await verifyAuth(token) : null;
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (jobId) {
            const attempts = await db.interviewAttempt.count({
                where: { user_id: payload.userId, job_id: jobId }
            });

            if (attempts >= 4) {
                return NextResponse.json({ allowed: false, reason: "You have reached the maximum of 4 attempts for this application." });
            }

            return NextResponse.json({ allowed: true, count: attempts });
        } else if (role) {
            // Recommend yourself check
            const attemptsThisWeek = await db.interviewAttempt.count({
                where: {
                    user_id: payload.userId,
                    job_id: null,
                    created_at: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (attemptsThisWeek >= 1) {
                return NextResponse.json({ allowed: false, reason: "You can only attempt one 'Recommend Yourself' test per week. Please try again next week." });
            }

            const totalAttempts = await db.interviewAttempt.count({
                where: { user_id: payload.userId, job_id: null }
            });

            return NextResponse.json({ allowed: true, count: totalAttempts });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
