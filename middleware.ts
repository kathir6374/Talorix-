import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";

export async function middleware(req: NextRequest) {
    const token = req.cookies.get("auth_token")?.value;

    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");
    // Private: only candidates can access their own dashboard
    const isCandidateDashboard = req.nextUrl.pathname.startsWith("/candidate-dashboard");
    // Public: candidate profile pages (/candidate/[id]) are viewable by anyone (employers, admins, etc.)
    const isCandidatePath = isCandidateDashboard; // kept for backwards compat below
    const isEmployerDashboard = req.nextUrl.pathname.startsWith("/employer-dashboard");
    const isAdminDashboard = req.nextUrl.pathname.startsWith("/admin");

    if (!token) {
        // Redirect unauthenticated users away from protected private routes
        if (isCandidateDashboard || isEmployerDashboard) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        return NextResponse.next();
    }

    // Verify the JWT token
    const verifiedToken = await verifyAuth(token).catch((err) => {
        console.error(err);
    });

    if (!verifiedToken) {
        // Invalid token — only block private routes
        if (isCandidateDashboard || isEmployerDashboard) {
            const loginUrl = new URL("/login", req.url);
            const response = NextResponse.redirect(loginUrl);
            // Clear the invalid cookies
            response.cookies.delete("auth_token");
            response.cookies.delete("is_logged_in");
            response.cookies.delete("user_role");
            return response;
        }
    }

    const role = verifiedToken?.role;

    // Protect Dashboard Roles — only the private candidate dashboard is role-restricted
    if (isCandidateDashboard && role !== "candidate") {
        return NextResponse.redirect(new URL("/employer-dashboard", req.url));
    }

    if (isEmployerDashboard && role !== "employer") {
        return NextResponse.redirect(new URL("/candidate-dashboard", req.url));
    }

    // Admin routes are protected at the API level (checking is_admin flag)
    // Middleware just ensures the user is authenticated

    // Redirect authenticated users away from auth pages
    if (isAuthPage && role) {
        if (role === "candidate") {
            return NextResponse.redirect(new URL("/candidate-dashboard", req.url));
        }
        if (role === "employer") {
            return NextResponse.redirect(new URL("/employer-dashboard", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/candidate-dashboard/:path*",
        "/candidate/:path*",
        "/employer-dashboard/:path*",
        "/admin/:path*",
        "/admin",
        "/login",
        "/signup",
    ],
};
