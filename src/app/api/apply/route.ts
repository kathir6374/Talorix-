import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendApplicationConfirmation, sendNewApplicationAlertEmail } from "@/lib/email";
import { deleteResumeFileByUrl, saveResumeFile } from "@/lib/resume-storage";
import { sendWhatsAppApplicationConfirmation, sendWhatsAppNewApplicationAlert } from "@/lib/whatsapp";

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null && "errors" in error) {
        const errors = error.errors;
        if (
            Array.isArray(errors) &&
            errors[0] &&
            typeof errors[0] === "object" &&
            errors[0] !== null &&
            "message" in errors[0] &&
            typeof errors[0].message === "string"
        ) {
            return errors[0].message;
        }
    }

    return "Internal server error";
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);

        if (!session || session.role !== "candidate") {
            return NextResponse.json({ error: "Unauthorized. Only candidates can apply for jobs." }, { status: 401 });
        }

        const formData = await req.formData();
        const jobId = formData.get("job_id") as string;
        const applicantName = (formData.get("applicant_name") as string) || "";
        const phone = (formData.get("phone") as string) || "";
        const address = (formData.get("address") as string) || "";
        const resumeFile = formData.get("resume") as File | null;

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        if (!applicantName.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const [candidate, job] = await Promise.all([
            db.user.findUnique({
                where: { id: session.userId },
                select: { email: true, phone: true, resume_url: true },
            }),
            db.job.findUnique({
                where: { id: jobId },
                select: {
                    id: true,
                    status: true,
                    job_title: true,
                    company_name: true,
                    posted_by: true,
                    employer: { select: { email: true, name: true, phone: true } },
                },
            }),
        ]);

        if (!candidate) {
            return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
        }

        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }

        if (job.status !== "ACTIVE") {
            return NextResponse.json({ error: "This job is not accepting applications right now." }, { status: 400 });
        }

        // Check if already applied
        const existingApplication = await db.application.findFirst({
            where: {
                job_id: jobId,
                candidate_id: session.userId,
            },
        });

        if (existingApplication) {
            return NextResponse.json(
                {
                    error: "You have already applied for this job.",
                    application: existingApplication,
                },
                { status: 409 }
            );
        }

        const existingResumeUrl =
            candidate.resume_url && candidate.resume_url !== "No resume provided"
                ? candidate.resume_url
                : null;
        let resumeUrl = existingResumeUrl || "No resume provided";
        let storedResumeUrl: string | null = null;

        // Store the resume file on the backend if provided
        if (resumeFile && resumeFile.size > 0) {
            const allowedTypes = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ];
            if (!allowedTypes.includes(resumeFile.type)) {
                return NextResponse.json({ error: "Only PDF and Word documents are allowed." }, { status: 400 });
            }

            if (resumeFile.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: "File size must be under 5MB." }, { status: 400 });
            }

            try {
                const buffer = Buffer.from(await resumeFile.arrayBuffer());
                const storedResume = await saveResumeFile(buffer, resumeFile.name, resumeFile.type);
                resumeUrl = storedResume.url;
                storedResumeUrl = storedResume.url;
            } catch (resumeError: unknown) {
                console.error("Resume Upload Error:", resumeError);
                return NextResponse.json(
                    { error: resumeError instanceof Error ? resumeError.message : "Failed to upload resume." },
                    { status: 500 }
                );
            }
        }

        let application;

        try {
            application = await db.application.create({
                data: {
                    job_id: jobId,
                    candidate_id: session.userId,
                    applicant_name: applicantName.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    resume_url: resumeUrl,
                },
            });
        } catch (applicationError) {
            await deleteResumeFileByUrl(storedResumeUrl).catch(() => {});
            throw applicationError;
        }

        // Update candidate skills if provided
        const skillsData = formData.get("skills") as string;
        if (skillsData) {
            try {
                const parsedSkills = JSON.parse(skillsData);
                await db.user.update({
                    where: { id: session.userId },
                    data: { skills: parsedSkills }
                });
            } catch (e) {
                console.error("Failed to update candidate skills during application:", e);
            }
        }

        // 1. Notify Candidate (Email & WhatsApp)
        if (candidate.email) {
            sendApplicationConfirmation(candidate.email, job.job_title, job.company_name)
                .catch((err) => console.error("Email confirmation failed:", err));
        }
        if (candidate.phone || phone) {
            sendWhatsAppApplicationConfirmation(candidate.phone || phone, job.job_title, job.company_name)
                .catch((err) => console.error("WhatsApp confirmation failed:", err));
        }

        // 2. Notify Employer (Email & WhatsApp)
        if (job.employer) {
            if (job.employer.email) {
                sendNewApplicationAlertEmail(
                    job.employer.email,
                    job.employer.name || job.company_name,
                    applicantName,
                    job.job_title
                ).catch((err) => console.error("Employer email alert failed:", err));
            }
            if (job.employer.phone) {
                sendWhatsAppNewApplicationAlert(
                    job.employer.phone,
                    job.employer.name || job.company_name,
                    applicantName,
                    job.job_title
                ).catch((err) => console.error("Employer WhatsApp alert failed:", err));
            }
        }

        return NextResponse.json({ message: "Application submitted successfully", application }, { status: 201 });

    } catch (error: unknown) {
        console.error("Application Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
