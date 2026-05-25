import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json(
        { message: "Logged out successfully" },
        { status: 200 }
    );

    // Clear all auth-related cookies with explicit flags
    // Better way to clear cookies in Next.js
    const cookiesToClear = ["auth_token", "is_logged_in", "user_role"];
    
    cookiesToClear.forEach(name => {
        response.cookies.delete(name);
    });

    return response;
}
