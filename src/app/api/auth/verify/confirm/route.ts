import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signToken, verifyAuth } from "@/lib/auth";
import {
    OTP_SESSION_COOKIE,
    confirmPendingSignupOtp,
    verifyUserOtp,
} from "@/lib/otp";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        const otpSession = cookieStore.get(OTP_SESSION_COOKIE);
        const body = await req.json().catch(() => null);
        const otp = body?.otp?.trim();

        if (!otp || !/^\d{6}$/.test(otp)) {
            return NextResponse.json({ error: "A valid 6-digit OTP is required" }, { status: 400 });
        }

        if (token) {
            const session = await verifyAuth(token.value);

            if (session) {
                const result = await verifyUserOtp(session.userId, otp);

                if (!result.success) {
                    return NextResponse.json({ error: result.error }, { status: result.status });
                }

                return NextResponse.json({ success: true, message: "Account verified successfully" });
            }
        }

        if (!otpSession?.value) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const signupResult = await confirmPendingSignupOtp(otpSession.value, otp);

        if (!signupResult.success) {
            return NextResponse.json({ error: signupResult.error }, { status: signupResult.status });
        }

        const tokenValue = await signToken({
            userId: signupResult.data.user.id,
            role: signupResult.data.user.role,
        });

        const response = NextResponse.json({
            success: true,
            message: "Account verified successfully",
        });

        response.cookies.set({
            name: "auth_token",
            value: tokenValue,
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
            value: signupResult.data.user.role,
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        response.cookies.set({
            name: OTP_SESSION_COOKIE,
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch (error) {
        console.error("OTP Confirm error:", error);
        return NextResponse.json({ error: "Unable to verify the OTP right now." }, { status: 503 });
    }
}
