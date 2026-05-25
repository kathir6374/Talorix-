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

// GET all users (paginated)
export async function GET(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const role = searchParams.get("role");
        const search = searchParams.get("search");
        const detail = searchParams.get("detail") === "true";
        const userId = searchParams.get("userId");
        const skip = (page - 1) * limit;

        const showSuspended = searchParams.get("showSuspended") === "true";
        const suspendStatus = searchParams.get("suspendStatus");

        if (detail || userId) {
            if (!userId) {
                return NextResponse.json({ error: "Candidate userId is required" }, { status: 400 });
            }

            const user = await db.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    headline: true,
                    bio: true,
                    phone: true,
                    avatar_url: true,
                    gender: true,
                    country: true,
                    state: true,
                    city: true,
                    skills: true,
                    experience: true,
                    education: true,
                    social_links: true,
                    open_to_work: true,
                    resume_url: true,
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
                    company_logo_url: true,
                    company_description: true,
                    company_website: true,
                    company_size: true,
                    company_industry: true,
                    company_sub_industry: true,
                    is_verified: true,
                    verified_employer: true,
                    is_recommended: true,
                    is_suspended: true,
                    created_at: true,
                    applications: {
                        orderBy: { applied_at: "desc" },
                        select: {
                            id: true,
                            applicant_name: true,
                            phone: true,
                            address: true,
                            resume_url: true,
                            application_status: true,
                            applied_at: true,
                            job: {
                                select: {
                                    id: true,
                                    job_title: true,
                                    company_name: true,
                                    job_category: true,
                                    job_type: true,
                                    work_model: true,
                                    country: true,
                                    state: true,
                                    city: true,
                                    status: true,
                                    created_at: true,
                                },
                            },
                        },
                    },
                    candidateInterviews: {
                        orderBy: { scheduled_time: "desc" },
                        select: {
                            id: true,
                            scheduled_time: true,
                            meeting_link: true,
                            interview_type: true,
                            notes: true,
                            status: true,
                            created_at: true,
                            job: { select: { id: true, job_title: true, company_name: true } },
                            employer: { select: { id: true, name: true, email: true } },
                        },
                    },
                    interviewAttempts: {
                        orderBy: { created_at: "desc" },
                        take: 10,
                        select: {
                            id: true,
                            role_tested_for: true,
                            score: true,
                            transcript: true,
                            feedback: true,
                            communication_score: true,
                            adaptability_score: true,
                            technical_score: true,
                            keyword_matches: true,
                            ai_technical_score: true,
                            ai_concept_score: true,
                            ai_communication_score: true,
                            ai_final_score: true,
                            ai_feedback: true,
                            created_at: true,
                            job: { select: { id: true, job_title: true, company_name: true } },
                        },
                    },
                    _count: {
                        select: {
                            applications: true,
                            bookmarks: true,
                            candidateInterviews: true,
                            interviewAttempts: true,
                            comments: true,
                            posts: true,
                            reportsAsUser: true,
                        },
                    },
                } as any,
            });

            if (!user || (user as any).role !== "candidate") {
                return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
            }

            return NextResponse.json({ user });
        }

        const where: any = {};
        if (suspendStatus === "active") {
            where.is_suspended = false;
        } else if (suspendStatus === "suspended") {
            where.is_suspended = true;
        } else if (!showSuspended && !searchParams.has("suspendStatus")) {
            where.is_suspended = false;
        }
        if (role) where.role = role;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const [users, total] = await Promise.all([
            db.user.findMany({
                where,
                select: {
                    id: true, name: true, email: true, role: true,
                    is_verified: true, verified_employer: true, is_admin: true,
                    is_suspended: true, is_recommended: true,
                    created_at: true, avatar_url: true, gender: true,
                    company_logo_url: true, resume_url: true,
                    _count: { select: { applications: true, postedJobs: true } },
                } as any,
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            db.user.count({ where }),
        ]);

        return NextResponse.json({
            users,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH — Verify employer / toggle admin
export async function PATCH(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { userId, action } = await req.json();
        if (!userId || !action) {
            return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
        }

        const validActions = [
            "verify_employer", "unverify_employer",
            "is_recommended", "unrecommend",
            "is_suspended", "unsuspend",
            "make_admin", "remove_admin",
            "delete_user"
        ];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        if (action === "delete_user") {
            await db.user.delete({ where: { id: userId } });
            return NextResponse.json({ message: "User deleted" });
        }

        const data: any = {};
        if (action === "verify_employer") data.verified_employer = true;
        if (action === "unverify_employer") data.verified_employer = false;
        if (action === "is_recommended") data.is_recommended = true;
        if (action === "unrecommend") data.is_recommended = false;
        if (action === "is_suspended") data.is_suspended = true;
        if (action === "unsuspend") data.is_suspended = false;
        if (action === "make_admin") data.is_admin = true;
        if (action === "remove_admin") data.is_admin = false;

        const updated = await db.user.update({
            where: { id: userId },
            data,
            select: { id: true, name: true, verified_employer: true, is_admin: true } as any,
        });

        return NextResponse.json({ message: "User updated", user: updated });
    } catch (error) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
