import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { createUserVerificationOtp } from "@/lib/otp";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { password, expectedRole } = body;
        const email = body.email?.toLowerCase().trim();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Find the user
        const user = await db.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Role mismatch check — block login BEFORE setting ANY cookies
        if (expectedRole && user.role !== expectedRole) {
            const actual = user.role === "candidate" ? "Candidate" : "Employer";
            return NextResponse.json(
                { error: `This account is registered as a ${actual}. Please try logging in as a ${actual}.` },
                { status: 403 }
            );
        }

        if (user.is_suspended) {
            return NextResponse.json(
                { error: "Your account has been suspended by the administrator." },
                { status: 403 }
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Generate token
        const token = await signToken({ userId: user.id, role: user.role });

        let requiresVerification = false;
        let verificationMessage = "Verification required. OTP sent to your email.";

        if (!user.is_verified) {
            requiresVerification = true;
            const otpResult = await createUserVerificationOtp(user.id);

            if (!otpResult.success) {
                return NextResponse.json(
                    { error: otpResult.error },
                    { status: otpResult.status }
                );
            }

            verificationMessage = otpResult.data.sentVia === "both"
                ? "Verification required. OTP sent to your email and WhatsApp."
                : "Verification required. OTP sent to your email.";
        }

        const response = NextResponse.json(
            {
                message: requiresVerification
                    ? verificationMessage
                    : "Login successful",
                user: { id: user.id, name: user.name, role: user.role },
                requiresVerification,
            },
            { status: 200 }
        );

        response.cookies.set({
            name: "auth_token",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        // Non-httpOnly flag cookie so the client JS can detect login state
        response.cookies.set({
            name: "is_logged_in",
            value: "1",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        // Store role for client-side nav decisions
        response.cookies.set({
            name: "user_role",
            value: user.role,
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });
        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Unable to complete login right now." },
            { status: 503 }
        );
    }
}
