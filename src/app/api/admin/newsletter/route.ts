import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendNewsletterBroadcastEmail } from "@/lib/email";

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

export async function GET() {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const subscribers = await db.newsletterSubscriber.findMany({
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                email: true,
                created_at: true,
            },
        });

        return NextResponse.json({
            subscribers,
            totalSubscribers: subscribers.length,
        });
    } catch (error) {
        console.error("Admin newsletter GET error:", error);
        return NextResponse.json({ error: "Unable to load newsletter subscribers right now." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const title = typeof body.title === "string" ? body.title.trim() : "";
        const content = typeof body.content === "string" ? body.content.trim() : "";

        if (!title) {
            return NextResponse.json({ error: "Newsletter title is required." }, { status: 400 });
        }

        if (!content) {
            return NextResponse.json({ error: "Newsletter content is required." }, { status: 400 });
        }

        const subscribers = await db.newsletterSubscriber.findMany({
            select: { email: true },
            orderBy: { created_at: "desc" },
        });

        if (subscribers.length === 0) {
            return NextResponse.json({ error: "There are no newsletter subscribers to send this to yet." }, { status: 400 });
        }

        let successCount = 0;
        const failedEmails: string[] = [];
        const batchSize = 10;

        for (let i = 0; i < subscribers.length; i += batchSize) {
            const batch = subscribers.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map((subscriber) => sendNewsletterBroadcastEmail(subscriber.email, title, content))
            );

            results.forEach((result, index) => {
                const email = batch[index].email;
                if (result.status === "fulfilled" && result.value) {
                    successCount += 1;
                    return;
                }

                failedEmails.push(email);

                if (result.status === "rejected") {
                    console.error("Newsletter send rejected:", {
                        email,
                        error: result.reason,
                    });
                } else {
                    console.error("Newsletter send failed:", { email });
                }
            });
        }

        return NextResponse.json({
            message: successCount === subscribers.length
                ? `Newsletter sent successfully to all ${successCount} subscribers.`
                : `Newsletter sent to ${successCount} subscribers. ${failedEmails.length} deliveries failed.`,
            successCount,
            failedCount: failedEmails.length,
            totalSubscribers: subscribers.length,
            failedEmails,
        });
    } catch (error) {
        console.error("Admin newsletter POST error:", error);
        return NextResponse.json({ error: "Unable to send the newsletter right now." }, { status: 500 });
    }
}
