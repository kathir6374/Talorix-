import { NextResponse } from "next/server";
import { requestPasswordResetOtp } from "@/lib/otp";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        const email = body?.email;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const result = await requestPasswordResetOtp(email);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            success: true,
            message: result.data.message,
        }, { status: 200 });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Unable to process the password reset request right now." }, { status: 503 });
    }
}
