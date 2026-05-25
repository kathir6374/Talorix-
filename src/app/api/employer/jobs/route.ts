import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const jobs = await db.job.findMany({
            where: { posted_by: session.userId },
            select: {
                id: true,
                status: true,
                job_title: true,
                job_description: true,
                company_name: true,
                job_category: true,
                job_type: true,
                work_model: true,
                country: true,
                state: true,
                city: true,
                salary_type: true,
                salary_min: true,
                salary_max: true,
                currency: true,
                experience_min: true,
                experience_max: true,
                education_level: true,
                required_skills: true,
                openings: true,
                shift_type: true,
                benefits: true,
                application_deadline: true,
                hr_contact_name: true,
                hr_contact_phone: true,
                external_apply_url: true,
                created_at: true,
                applications: {
                    where: {
                        candidate: {
                            is_suspended: false
                        }
                    },
                    select: {
                        id: true,
                        candidate_id: true,
                        applicant_name: true,
                        phone: true,
                        address: true,
                        resume_url: true,
                        application_status: true,
                        applied_at: true,
                        candidate: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar_url: true,
                                gender: true,
                                headline: true,
                                bio: true,
                                phone: true,
                                country: true,
                                state: true,
                                city: true,
                                skills: true,
                                experience: true,
                                education: true,
                                social_links: true,
                                resume_url: true,
                                certifications: true,
                                projects: true,
                                portfolio_links: true,
                            }
                        }
                    },
                    orderBy: { applied_at: "desc" },
                },
            },
            orderBy: { created_at: "desc" },
        });

        const jobIds = jobs.map((job) => job.id);
        const candidateIds = Array.from(new Set(
            jobs.flatMap((job) => job.applications.map((app) => app.candidate_id))
        ));

        const attempts = jobIds.length > 0 && candidateIds.length > 0
            ? await db.interviewAttempt.findMany({
                where: {
                    job_id: { in: jobIds },
                    user_id: { in: candidateIds },
                },
                orderBy: { created_at: "desc" },
            })
            : [];

        const latestAttemptByCandidateJob = new Map<string, (typeof attempts)[number]>();
        attempts.forEach((attempt) => {
            if (!attempt.job_id) return;
            const key = `${attempt.user_id}:${attempt.job_id}`;
            if (!latestAttemptByCandidateJob.has(key)) {
                latestAttemptByCandidateJob.set(key, attempt);
            }
        });

        type EmployerJob = (typeof jobs)[number];
        type EmployerJobApplication = EmployerJob["applications"][number];

        const jobsWithFilteredAttempts = jobs.map((job: EmployerJob) => ({
            ...job,
            applications: job.applications.map((app: EmployerJobApplication) => {
                const latest_interview_score = latestAttemptByCandidateJob.get(`${app.candidate_id}:${job.id}`) || null;
                return {
                    ...app,
                    latest_interview_score,
                    candidate: {
                        ...app.candidate,
                        interviewAttempts: undefined // Remove other attempts for privacy/cleanliness
                    }
                };
            })
        }));

        return NextResponse.json({ jobs: jobsWithFilteredAttempts });
    } catch (error) {
        console.error("Employer Jobs Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
