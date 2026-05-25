import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendInterviewScheduledEmail, sendInterviewStatusUpdateEmail } from "@/lib/email";
import { sendWhatsAppInterviewScheduled, sendWhatsAppInterviewStatusUpdate } from "@/lib/whatsapp";
import { Prisma } from "@prisma/client";

const LOCKED_APPLICATION_STATUSES = ["closed"];

// GET — Fetch interviews for candidate or employer
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const where: Prisma.InterviewWhereInput = {};

        if (session.role === "candidate") {
            where.candidate_id = session.userId;
            where.employer = { is_suspended: false };

            await db.interview.updateMany({
                where: {
                    candidate_id: session.userId,
                    status: "Scheduled",
                    scheduled_time: { lt: new Date() },
                },
                data: { status: "Completed" },
            });
        } else if (session.role === "employer") {
            where.employer_id = session.userId;
            where.candidate = { is_suspended: false };
        } else {
            return NextResponse.json({ error: "Invalid role" }, { status: 403 });
        }

        if (status) where.status = status;

        const interviews = await db.interview.findMany({
            where,
            include: {
                job: { select: { job_title: true, company_name: true } },
                candidate: { select: { id: true, name: true, email: true, gender: true, avatar_url: true, phone: true } },
                employer: { select: { id: true, name: true, company_logo_url: true } },
            },
            orderBy: { scheduled_time: "asc" },
        });

        const safeInterviews = interviews.map((interview) => ({
            ...interview,
            meeting_link: interview.status === "Cancelled" ? "" : interview.meeting_link,
        }));

        return NextResponse.json({ interviews: safeInterviews });
    } catch (error) {
        console.error("Interview Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST — Schedule a new interview (employer only)
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { jobId, candidateId, scheduledTime, meetingLink, interviewType, notes, applicationId } = body;

        if (!jobId || !candidateId || !scheduledTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify the job belongs to this employer
        const job = await db.job.findUnique({
            where: { id: jobId },
            select: { posted_by: true, job_title: true, company_name: true },
        });

        if (!job || job.posted_by !== session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (applicationId) {
            const application = await db.application.findUnique({
                where: { id: applicationId },
                select: { application_status: true },
            });

            if (application && LOCKED_APPLICATION_STATUSES.includes(application.application_status)) {
                return NextResponse.json({ error: "Candidate stage is locked and cannot be changed" }, { status: 409 });
            }
        }

        const interview = await db.interview.create({
            data: {
                job_id: jobId,
                candidate_id: candidateId,
                employer_id: session.userId as string,
                scheduled_time: new Date(scheduledTime),
                meeting_link: meetingLink || "",
                interview_type: interviewType || "Online",
                notes: notes || null,
            },
        });

        // Update application status to interview if applicationId provided
        if (applicationId) {
            await db.application.update({
                where: { id: applicationId },
                data: { application_status: "interview" },
            }).catch(() => { });
        }

        // Send notifications to candidate
        const candidate = await db.user.findUnique({
            where: { id: candidateId },
            select: { email: true, name: true, phone: true },
        });

        if (candidate) {
            const dateStr = new Date(scheduledTime).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });

            // 1. Email notification
            if (candidate.email) {
                sendInterviewScheduledEmail(
                    candidate.email,
                    candidate.name || "Candidate",
                    job.job_title,
                    job.company_name,
                    dateStr,
                    meetingLink || "",
                    interviewType || "Online"
                ).catch((err) => console.error("Failed to send interview email:", err));
            }

            // 2. WhatsApp notification
            if (candidate.phone) {
                sendWhatsAppInterviewScheduled(
                    candidate.phone,
                    job.job_title,
                    job.company_name,
                    dateStr
                ).catch((err) => console.error("Failed to send interview WhatsApp:", err));
            }
        }

        return NextResponse.json({ message: "Interview scheduled", interview }, { status: 201 });

    } catch (error) {
        console.error("Interview Schedule Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH — Update interview status
export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { interviewId, status } = await req.json();
        if (!interviewId || !status) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const validStatuses = ["Scheduled", "Completed", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const interview = await db.interview.findUnique({
            where: { id: interviewId },
            include: {
                job: { select: { job_title: true, company_name: true } },
                candidate: { select: { email: true, name: true, phone: true } },
            }
        });

        if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Only employer who created or the candidate can update
        if (interview.employer_id !== session.userId && interview.candidate_id !== session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const updated = await db.interview.update({
            where: { id: interviewId },
            data: { status },
        });

        // Notifications for Completion or Cancellation
        if (status !== "Scheduled") {
            // Notify Candidate
            if (interview.candidate.email) {
                sendInterviewStatusUpdateEmail(
                    interview.candidate.email,
                    interview.candidate.name || "Candidate",
                    interview.job.job_title,
                    interview.job.company_name,
                    status
                ).catch((err) => console.error("Interview update email failed:", err));
            }

            if (interview.candidate.phone) {
                sendWhatsAppInterviewStatusUpdate(
                    interview.candidate.phone,
                    interview.job.job_title,
                    interview.job.company_name,
                    status
                ).catch((err) => console.error("Interview update WhatsApp failed:", err));
            }
        }

        return NextResponse.json({ message: "Updated", interview: updated });
    } catch (error) {
        console.error("Interview Update Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
