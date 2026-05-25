import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_MESSAGE_REASON = "contact_message";

function buildContactReportDescription(message: {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: Date;
}, senderType: "candidate" | "company") {
    return JSON.stringify({
        type: CONTACT_MESSAGE_REASON,
        contactMessageId: message.id,
        companyName: message.name,
        senderEmail: message.email,
        subject: message.subject,
        submittedMessage: message.message,
        submittedAt: message.created_at,
        senderType,
    });
}

async function getOptionalAuthenticatedUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
        return null;
    }

    const session = await verifyAuth(token.value);
    if (!session) {
        return null;
    }

    return db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true },
    });
}

async function getAdminUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
        return null;
    }

    const session = await verifyAuth(token.value);
    if (!session) {
        return null;
    }

    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, is_admin: true },
    });

    if (!user?.is_admin) {
        return null;
    }

    return user;
}

export async function GET(req: Request) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limitParam = parseInt(searchParams.get("limit") || "50", 10);
        const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);

        const messages = await db.contactMessage.findMany({
            orderBy: { created_at: "desc" },
            take: limit,
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Contact Messages Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authenticatedUser = await getOptionalAuthenticatedUser();

        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const subject = typeof body.subject === "string" ? body.subject.trim() : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
        }

        if (name.length > 120 || subject.length > 200 || message.length > 5000) {
            return NextResponse.json({ error: "One or more fields exceed the allowed length" }, { status: 400 });
        }

        const savedMessage = await db.contactMessage.create({
            data: {
                name,
                email,
                subject,
                message,
            },
        });

        if (authenticatedUser?.role === "candidate" || authenticatedUser?.role === "employer") {
            await db.report.create({
                data: {
                    user_id: authenticatedUser.id,
                    reason: CONTACT_MESSAGE_REASON,
                    description: buildContactReportDescription(
                        savedMessage,
                        authenticatedUser.role === "employer" ? "company" : "candidate"
                    ),
                },
            });
        }

        return NextResponse.json(
            { message: "Message saved successfully", contactMessageId: savedMessage.id },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("Contact Message Save Error:", error);
            return NextResponse.json({ error: "Unable to save your message right now" }, { status: 500 });
        }

        console.error("Contact Message Save Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
