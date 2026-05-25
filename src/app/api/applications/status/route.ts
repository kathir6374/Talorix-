import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendStatusUpdateEmail } from "@/lib/email";
import { sendWhatsAppStatusUpdate } from "@/lib/whatsapp";

const LOCKED_APPLICATION_STATUSES = ["closed"];

export async function PATCH(req: Request) {
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

        const body = await req.json();
        const { applicationId, status } = body;

        if (!applicationId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const validStatuses = ["applied", "shortlisted", "interview", "rejected", "hired"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Verify the application belongs to a job posted by this employer
        const application = await db.application.findUnique({
            where: { id: applicationId },
            include: {
                job: true,
                candidate: { select: { email: true, phone: true } },
            },
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if (application.job.posted_by !== session.userId) {
            return NextResponse.json({ error: "Unauthorized to manage this application" }, { status: 403 });
        }

        if (LOCKED_APPLICATION_STATUSES.includes(application.application_status)) {
            return NextResponse.json({ error: "Candidate stage is locked and cannot be changed" }, { status: 409 });
        }

        const updatedApplication = await db.application.update({
            where: { id: applicationId },
            data: {
                application_status: status,
            },
        });

        if (status === "rejected") {
            await db.interview.updateMany({
                where: {
                    job_id: application.job_id,
                    candidate_id: application.candidate_id,
                    employer_id: session.userId,
                    status: "Scheduled",
                },
                data: {
                    status: "Cancelled",
                },
            });
        }

        // Send notifications to candidate
        if (application.candidate && status !== "applied") {
            // 1. Email notification
            if (application.candidate.email) {
                sendStatusUpdateEmail(
                    application.candidate.email,
                    application.job.job_title,
                    status
                ).catch((err) => console.error("Failed to send status email:", err));
            }

            // 2. WhatsApp notification
            if (application.candidate.phone) {
                sendWhatsAppStatusUpdate(
                    application.candidate.phone,
                    application.job.job_title,
                    status
                ).catch((err) => console.error("Failed to send status WhatsApp:", err));
            }
        }

        return NextResponse.json({
            message: "Status updated successfully",
            application: updatedApplication,
        });

    } catch (error) {
        console.error("Status Update Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
