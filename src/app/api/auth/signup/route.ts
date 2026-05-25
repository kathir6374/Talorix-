import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { OTP_SESSION_COOKIE, startSignupOtpSession } from "@/lib/otp";

function getPublicSignupErrorMessage(error: string, status: number) {
    if (status >= 500) {
        return "Unable to send the OTP right now. Please try again in a moment.";
    }

    if (
        error.includes("535-5.7.8") ||
        error.includes("BadCredentials") ||
        error.includes("Username and Password not accepted")
    ) {
        return "Unable to send the OTP right now. Please try again in a moment.";
    }

    return error;
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { name, phone, password, role } = body;
        const email = body.email?.toLowerCase().trim();

        if (!name || !email || !phone || !password || !role) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (role !== "candidate" && role !== "employer") {
            return NextResponse.json(
                { error: "Invalid role" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const signupOtpResult = await startSignupOtpSession({
            name,
            email,
            phone,
            role,
            passwordHash: hashedPassword,
        });

        if (!signupOtpResult.success) {
            const responseBody: { error: string; code?: string } = {
                error: getPublicSignupErrorMessage(signupOtpResult.error, signupOtpResult.status),
            };

            if (signupOtpResult.status === 409) {
                responseBody.code = "ACCOUNT_EXISTS";
            }

            return NextResponse.json(responseBody, { status: signupOtpResult.status });
        }

        const response = NextResponse.json(
            {
                message: signupOtpResult.data.sentVia === "both"
                    ? "Verification required. OTP sent to your email and WhatsApp."
                    : signupOtpResult.data.sentVia === "whatsapp"
                        ? "Verification required. OTP sent to your WhatsApp number."
                    : "Verification required. OTP sent to your email.",
                user: { id: signupOtpResult.data.sessionId, name, role },
                requiresVerification: true,
                sentVia: signupOtpResult.data.sentVia,
            },
            { status: 201 }
        );

        response.cookies.set({
            name: OTP_SESSION_COOKIE,
            value: signupOtpResult.data.sessionId,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 5,
        });

        return response;
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Unable to start signup verification right now." },
            { status: 503 }
        );
    }
}
