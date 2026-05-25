import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getEmployerSubscriptionSnapshot } from "@/lib/employer-subscriptions";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const subscriptionSnapshot = await getEmployerSubscriptionSnapshot(session.userId);
        if (subscriptionSnapshot.monetizationEnabled && !subscriptionSnapshot.capabilities.canAccessAiFeatures) {
            return NextResponse.json({
                error: "Premium AI talent discovery is available on the Elite employer plan only.",
            }, { status: 403 });
        }

        // 1. Get employer's job skills
        const employerJobs = await db.job.findMany({
            where: { posted_by: session.userId, status: "ACTIVE" },
            select: { required_skills: true, job_title: true }
        });

        const employerSkills = new Set<string>();
        employerJobs.forEach(job => {
            let skills: string[] = [];
            if (Array.isArray(job.required_skills)) {
                skills = job.required_skills as string[];
            } else if (typeof job.required_skills === "string") {
                try { skills = JSON.parse(job.required_skills); } catch (e) { }
            }
            skills.forEach(s => employerSkills.add(s.toLowerCase()));
        });

        const employerSkillArray = Array.from(employerSkills);

        // 2. Fetch candidates created in the last 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const candidates = await db.user.findMany({
            where: {
                role: "candidate",
                is_suspended: false,
                created_at: {
                    gte: yesterday
                },
            },
            select: {
                id: true,
                name: true,
                skills: true,
                created_at: true,
                total_experience: true,
                country: true,
                state: true,
                city: true,
                phone: true,
                expected_salary: true,
                current_job_title: true, // for WhatsApp msg
                interviewAttempts: {
                    select: { score: true },
                    orderBy: { score: 'desc' },
                    take: 1
                }
            },
        });

        // 3. Filter natively (score >= 80, skill overlap)
        const matches = candidates.filter(c => {
            const highestScore = c.interviewAttempts[0]?.score || 0;
            if (highestScore < 80) return false;

            if (employerSkillArray.length > 0) {
                let cSkills: string[] = [];
                if (Array.isArray(c.skills)) {
                    cSkills = c.skills as string[];
                } else if (typeof c.skills === "string") {
                    try { cSkills = JSON.parse(c.skills); } catch (e) { }
                }
                const hasOverlap = cSkills.some(cs => employerSkillArray.includes(cs.toLowerCase()));
                if (!hasOverlap) return false;
            }

            return true;
        });

        // Sort by score DESC
        matches.sort((a, b) => {
            const scoreA = a.interviewAttempts[0]?.score || 0;
            const scoreB = b.interviewAttempts[0]?.score || 0;
            return scoreB - scoreA;
        });

        // Limit 9
        const finalMatches = matches.slice(0, 9);

        return NextResponse.json({ candidates: finalMatches });
    } catch (error) {
        console.error("Fresh matches error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
