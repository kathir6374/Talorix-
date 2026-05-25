import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        const subscribers = await db.newsletterSubscriber.findMany({
            orderBy: { created_at: "desc" },
            take: limit,
        });

        return NextResponse.json({ subscribers });
    } catch (error) {
        console.error("Newsletter Subscribers Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
        }

        const existingSubscriber = await db.newsletterSubscriber.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingSubscriber) {
            return NextResponse.json({ message: "You are already subscribed" });
        }

        const subscriber = await db.newsletterSubscriber.create({
            data: { email },
        });

        return NextResponse.json(
            { message: "Subscribed successfully", subscriberId: subscriber.id },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json({ message: "You are already subscribed" });
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("Newsletter Subscription Error:", error);
            return NextResponse.json({ error: "Unable to save your subscription right now" }, { status: 500 });
        }

        console.error("Newsletter Subscription Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
