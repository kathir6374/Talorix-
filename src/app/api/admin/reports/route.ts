import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

const CONTACT_MESSAGE_REASON = "contact_message";

function getReportSourceTypeLabel(senderType?: string | null) {
    if (senderType === "company") return "Company Report";
    if (senderType === "candidate") return "Candidate Report";
    return "User Report";
}

function parseContactReportDescription(description: string | null) {
    if (!description) return null;

    try {
        const parsed = JSON.parse(description);
        if (parsed?.type !== CONTACT_MESSAGE_REASON || !parsed.contactMessageId) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function contactMessageToReport(message: any) {
    return {
        id: `contact-${message.id}`,
        source: "contact",
        status: "pending",
        reason: "Contact Message",
        description: message.message,
        created_at: message.created_at,
        contactMessage: message,
        reportSourceType: "User Report",
    };
}

function trackedContactReportToResponse(report: any) {
    const contactDetails = parseContactReportDescription(report.description);

    if (!contactDetails) {
        return {
            ...report,
            reportSourceType: getReportSourceTypeLabel(
                report.reporter?.role === "employer"
                    ? "company"
                    : report.reporter?.role === "candidate"
                        ? "candidate"
                        : null
            ),
        };
    }

    return {
        ...report,
        source: "contact",
        reason: "Contact Message",
        description: contactDetails.submittedMessage || report.description,
        reportSourceType: getReportSourceTypeLabel(contactDetails.senderType),
        contactMessage: {
            id: contactDetails.contactMessageId,
            name: contactDetails.companyName,
            email: contactDetails.senderEmail,
            subject: contactDetails.subject,
            message: contactDetails.submittedMessage,
            created_at: contactDetails.submittedAt || report.created_at,
        },
    };
}

function buildContactReportDescription(message: any, senderType?: string | null) {
    return JSON.stringify({
        type: CONTACT_MESSAGE_REASON,
        contactMessageId: message.id,
        companyName: message.name,
        senderEmail: message.email,
        subject: message.subject,
        submittedMessage: message.message,
        submittedAt: message.created_at,
        senderType: senderType || null,
    });
}

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

// GET — All reported items
export async function GET(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "pending";
        const type = searchParams.get("type"); // job, employer, candidate

        const where: any = status === "all" ? {} : { status };
        if (type === "job") where.job_id = { not: null };
        if (type === "user") where.reported_user_id = { not: null };
        if (type === "contact") where.reason = CONTACT_MESSAGE_REASON;

        const trackedReports = await db.report.findMany({
            where,
            include: {
                reporter: { select: { id: true, name: true, email: true, role: true } },
                job: {
                    select: {
                        id: true, job_title: true, company_name: true,
                        status: true, posted_by: true, created_at: true,
                    },
                },
                reportedUser: {
                    select: {
                        id: true, name: true, email: true, role: true, is_suspended: true
                    }
                }
            },
            orderBy: { created_at: "desc" },
            take: 100,
        });

        let pendingContactReports: any[] = [];
        if ((status === "pending" || status === "all") && (!type || type === "contact")) {
            const trackedContactReports = await db.report.findMany({
                where: { reason: CONTACT_MESSAGE_REASON },
                select: { description: true },
            });
            const trackedContactMessageIds = trackedContactReports
                .map((report) => parseContactReportDescription(report.description)?.contactMessageId)
                .filter(Boolean);

            const contactMessages = await db.contactMessage.findMany({
                where: trackedContactMessageIds.length
                    ? { id: { notIn: trackedContactMessageIds } }
                    : {},
                orderBy: { created_at: "desc" },
                take: 100,
            });

            pendingContactReports = contactMessages.map(contactMessageToReport);
        }

        const reports = [...pendingContactReports, ...trackedReports.map(trackedContactReportToResponse)]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 100);

        return NextResponse.json({ reports });
    } catch (error) {
        console.error("Admin reports error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH — Update report status (and optionally remove/suspend)
export async function PATCH(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { reportId, action } = await req.json();
        if (!reportId || !action) {
            return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
        }

        const validActions = ["dismiss", "resolve", "remove_job", "suspend_user", "warn_user"];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        if (String(reportId).startsWith("contact-")) {
            if (action !== "dismiss" && action !== "resolve") {
                return NextResponse.json({ error: "Invalid action for contact message" }, { status: 400 });
            }

            const contactMessageId = String(reportId).replace("contact-", "");
            const contactMessage = await db.contactMessage.findUnique({
                where: { id: contactMessageId },
            });

            if (!contactMessage) {
                return NextResponse.json({ error: "Contact message not found" }, { status: 404 });
            }

            const status = action === "dismiss" ? "dismissed" : "resolved";
            const existingContactReports = await db.report.findMany({
                where: { reason: CONTACT_MESSAGE_REASON },
                select: { id: true, description: true },
            });
            const existingContactReport = existingContactReports.find((report) => {
                return parseContactReportDescription(report.description)?.contactMessageId === contactMessageId;
            });

            if (existingContactReport) {
                await db.report.update({
                    where: { id: existingContactReport.id },
                    data: { status },
                });
            } else {
                await db.report.create({
                    data: {
                        user_id: admin.id,
                        reason: CONTACT_MESSAGE_REASON,
                        description: buildContactReportDescription(contactMessage),
                        status,
                    },
                });
            }

            return NextResponse.json({ message: "Action completed successfully" });
        }

        const report = await db.report.findUnique({
            where: { id: reportId },
            include: { job: true, reportedUser: true },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        if (action === "dismiss") {
            await db.report.update({
                where: { id: reportId },
                data: { status: "dismissed" },
            });
        } else if (action === "resolve") {
            await db.report.update({
                where: { id: reportId },
                data: { status: "resolved" },
            });
        } else if (action === "remove_job") {
            if (!report.job_id) {
                return NextResponse.json({ error: "This report is not linked to a job" }, { status: 400 });
            }

            await db.$transaction([
                db.job.update({
                    where: { id: report.job_id },
                    data: { status: "CLOSED" },
                }),
                db.report.updateMany({
                    where: { job_id: report.job_id },
                    data: { status: "resolved" },
                }),
            ]);
        } else if (action === "suspend_user") {
            if (!report.reported_user_id) {
                return NextResponse.json({ error: "This report is not linked to a user" }, { status: 400 });
            }

            await db.$transaction([
                db.user.update({
                    where: { id: report.reported_user_id },
                    data: { is_suspended: true },
                }),
                db.report.updateMany({
                    where: { reported_user_id: report.reported_user_id },
                    data: { status: "resolved" },
                }),
            ]);
        } else if (action === "warn_user") {
            await db.report.update({
                where: { id: reportId },
                data: { status: "resolved" },
            });
        }

        return NextResponse.json({ message: "Action completed successfully" });
    } catch (error) {
        console.error("Admin report action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
