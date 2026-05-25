import { NextResponse } from "next/server";
import { resetPasswordWithOtp } from "@/lib/otp";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        const email = body?.email;
        const otp = body?.otp;
        const newPassword = body?.newPassword;

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await resetPasswordWithOtp(email, otp, newPassword);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Unable to reset the password right now." }, { status: 503 });
    }
}
