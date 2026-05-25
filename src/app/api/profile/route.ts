import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCandidateMetricSnapshot } from "@/lib/ranking";

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    headline: true,
    bio: true,
    phone: true,
    avatar_url: true,
    gender: true,
    skills: true,
    experience: true,
    education: true,
    social_links: true,
    open_to_work: true,
    resume_url: true,
    company_logo_url: true,
    company_description: true,
    company_website: true,
    company_size: true,
    company_industry: true,
    company_sub_industry: true,
    is_verified: true,
    verified_employer: true,
    is_admin: true,
    is_suspended: true,
    created_at: true,
    city: true,
    state: true,
    country: true,
    current_job_title: true,
    current_company: true,
    total_experience: true,
    certifications: true,
    projects: true,
    portfolio_links: true,
    expected_salary: true,
    preferred_location: true,
    ai_rank: true,
    ai_percentile: true,
    ai_confidence_score: true,
    ai_concept_coverage: true,
    ai_feedback_summary: true,
    skill_rank: true,
    skill_percentile: true,
    availability_status: true,
    available_in_days: true,
    profile_views: true,
};

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: USER_SELECT,
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (user.is_suspended && !user.is_admin) {
            return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
        }

        if (user.role === "candidate") {
            const metrics = await getCandidateMetricSnapshot(user.id);
            return NextResponse.json({ user: { ...user, ...metrics } });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Profile GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        // Build the data object only with fields that are explicitly sent
        const allowedFields = [
            "name", "headline", "bio", "phone", "avatar_url", "gender",
            "skills", "experience", "education", "social_links", "open_to_work", "resume_url",
            "company_logo_url", "company_description", "company_website", "company_size", "company_industry", "company_sub_industry",
            "city", "state", "country",
            "current_job_title", "current_company", "total_experience",
            "certifications", "projects", "portfolio_links",
            "expected_salary", "preferred_location",
        ];

        const data: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                data[field] = body[field];
            }
        }

        // Prevent empty name
        if (data.name === "") delete data.name;

        const checkUser = await db.user.findUnique({ where: { id: session.userId }, select: { is_suspended: true, is_admin: true } });
        if (checkUser?.is_suspended && !checkUser?.is_admin) {
            return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
        }

        const updated = await db.user.update({
            where: { id: session.userId },
            data,
            select: USER_SELECT,
        });

        if (updated.role === "candidate") {
            const metrics = await getCandidateMetricSnapshot(updated.id);
            return NextResponse.json({ user: { ...updated, ...metrics } });
        }

        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error("Profile PATCH error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
