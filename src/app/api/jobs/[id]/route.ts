import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        const session = token ? await verifyAuth(token.value).catch(() => null) : null;

        const [job, viewerApplication] = await Promise.all([
            db.job.findUnique({
                where: { id: jobId },
                include: {
                    employer: {
                        select: {
                            name: true,
                            company_description: true,
                            company_website: true,
                            company_size: true,
                            avatar_url: true,
                            company_logo_url: true,
                            verified_employer: true,
                            is_suspended: true,
                        }
                    }
                }
            }),
            session?.role === "candidate"
                ? db.application.findFirst({
                    where: {
                        job_id: jobId,
                        candidate_id: session.userId,
                    },
                    select: {
                        id: true,
                        application_status: true,
                        applied_at: true,
                    },
                })
                : Promise.resolve(null),
        ]);

        if (!job || job.employer?.is_suspended) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({ job, viewerApplication }, { status: 200 });
    } catch (error) {
        console.error("Error fetching job details:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        // Prevent changing immutable fields or malicious updates
        delete body.id;
        delete body.posted_by;
        delete body.created_at;

        // Convert array and numeric types if passed as strings depending on client
        if (typeof body.salary_min === 'string') body.salary_min = parseInt(body.salary_min) || 0;
        if (typeof body.salary_max === 'string') body.salary_max = parseInt(body.salary_max) || 0;
        if (typeof body.experience_min === 'string') body.experience_min = parseInt(body.experience_min) || 0;
        if (typeof body.experience_max === 'string') body.experience_max = parseInt(body.experience_max) || 0;
        if (typeof body.openings === 'string') body.openings = parseInt(body.openings) || 1;

        if (typeof body.required_skills === 'string') {
            body.required_skills = body.required_skills.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        if (typeof body.benefits === 'string') {
            body.benefits = body.benefits.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        if (typeof body.search_keywords === 'string') {
            body.search_keywords = body.search_keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        if (typeof body.ai_interview_questions === 'string') {
            body.ai_interview_questions = body.ai_interview_questions.split("\n").map((s: string) => s.trim()).filter(Boolean);
        }

        if (body.application_deadline) {
            body.application_deadline = new Date(body.application_deadline);
        }

        const job = await db.job.findUnique({ where: { id: jobId } });
        if (!job || job.posted_by !== session.userId) {
            return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
        }

        const updatedJob = await db.job.update({
            where: { id: jobId },
            data: body,
        });

        return NextResponse.json({ job: updatedJob }, { status: 200 });
    } catch (error) {
        console.error("Error updating job:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
