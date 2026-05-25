import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) return null;

    const session = await verifyAuth(token.value);
    if (!session) return null;

    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, is_admin: true },
    });

    if (!user?.is_admin) return null;
    return user;
}

export async function GET() {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        return NextResponse.json({
            admin: {
                email: admin.email,
            },
        });
    } catch (error) {
        console.error("Super admin settings fetch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

        if (!email) {
            return NextResponse.json({ error: "Super admin email is required" }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
        }

        if (password && password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
        }

        if (email === admin.email && !password) {
            return NextResponse.json({ error: "No credential changes were provided." }, { status: 400 });
        }

        const data: { email: string; password_hash?: string } = { email };

        if (password) {
            data.password_hash = await bcrypt.hash(password, 10);
        }

        const updatedAdmin = await db.user.update({
            where: { id: admin.id },
            data,
            select: { id: true, email: true },
        });

        return NextResponse.json({
            message: "Super admin credentials updated successfully",
            admin: updatedAdmin,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
        }

        console.error("Super admin settings update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
