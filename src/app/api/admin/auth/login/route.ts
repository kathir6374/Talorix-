import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const email = body.email?.toLowerCase().trim();
        const password = body.password;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                password_hash: true,
                is_admin: true,
                is_suspended: true,
            },
        });

        if (!user || !user.is_admin) {
            return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
        }

        if (user.is_suspended) {
            return NextResponse.json(
                { error: "This admin account has been suspended." },
                { status: 403 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
        }

        const token = await signToken({ userId: user.id, role: "admin" });
        const response = NextResponse.json({
            message: "Admin login successful",
            user: { id: user.id, name: user.name, role: "admin", is_admin: true },
        });

        response.cookies.set({
            name: "auth_token",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        response.cookies.set({
            name: "is_logged_in",
            value: "1",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        response.cookies.set({
            name: "user_role",
            value: "admin",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        return response;
    } catch (error) {
        console.error("Admin login error:", error);
        return NextResponse.json(
            { error: "Unable to complete admin login right now." },
            { status: 503 }
        );
    }
}
