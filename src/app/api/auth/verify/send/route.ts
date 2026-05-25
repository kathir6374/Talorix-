import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import {
    OTP_SESSION_COOKIE,
    getPendingSignupDetails,
    isPhoneOtpProviderConfigured,
    resendPendingSignupOtp,
    resendUserVerificationOtp,
} from "@/lib/otp";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        const otpSession = cookieStore.get(OTP_SESSION_COOKIE);
        const body = await req.json().catch(() => null);
        const isCheckOnly = !!body?.checkOnly;
        const method = body?.method === "whatsapp" ? "whatsapp" : "email";

        if (token) {
            const session = await verifyAuth(token.value);

            if (session) {
                const user = await db.user.findUnique({
                    where: { id: session.userId },
                    select: { phone: true },
                });

                if (isCheckOnly) {
                    return NextResponse.json({
                        success: true,
                        hasPhone: !!user?.phone && isPhoneOtpProviderConfigured(),
                    });
                }

                const result = await resendUserVerificationOtp(session.userId, method);

                if (!result.success) {
                    return NextResponse.json({ error: result.error }, { status: result.status });
                }

                return NextResponse.json({
                    success: true,
                    message: result.data.sentVia === "both"
                        ? "OTP sent to your email and WhatsApp"
                        : result.data.sentVia === "whatsapp"
                            ? "OTP sent to your WhatsApp number"
                            : "OTP sent to your email",
                    sentVia: result.data.sentVia,
                    hasPhone: result.data.hasPhone,
                });
            }
        }

        if (!otpSession?.value) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (isCheckOnly) {
            const details = await getPendingSignupDetails(otpSession.value);

            if (!details.success) {
                return NextResponse.json({ error: details.error }, { status: details.status });
            }

            return NextResponse.json({
                success: true,
                hasPhone: details.data.hasPhone,
            });
        }

        const result = await resendPendingSignupOtp(
            otpSession.value,
            method
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            success: true,
            message: result.data.sentVia === "both"
                ? "OTP sent to your email and WhatsApp"
                : result.data.sentVia === "whatsapp"
                    ? "OTP sent to your WhatsApp number"
                    : "OTP sent to your email address",
            sentVia: result.data.sentVia,
            hasPhone: result.data.hasPhone,
        });
    } catch (error) {
        console.error("OTP Send error:", error);
        return NextResponse.json({ error: "Unable to send the OTP right now." }, { status: 503 });
    }
}
