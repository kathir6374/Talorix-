import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import {
    getEmployerSubscriptionPlans,
    updateEmployerSubscriptionPlanAmounts,
} from "@/lib/employer-subscriptions";

async function getAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) return null;
    const session = await verifyAuth(token.value);
    if (!session) return null;
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, is_admin: true },
    });
    if (!user?.is_admin) return null;
    return user;
}

export async function GET() {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        let settings = await db.systemSettings.findUnique({
            where: { id: 1 },
        });

        if (!settings) {
            settings = await db.systemSettings.create({
                data: { id: 1, monetization_enabled: false },
            });
        }

        const employerPlans = await getEmployerSubscriptionPlans();

        return NextResponse.json({
            settings: {
                ...settings,
                employer_plans: employerPlans,
            },
        });
    } catch (error) {
        console.error("Admin settings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const nextMonetizationEnabled = typeof body?.monetization_enabled === "boolean"
            ? body.monetization_enabled
            : false;

        const updated = await db.systemSettings.upsert({
            where: { id: 1 },
            update: { monetization_enabled: nextMonetizationEnabled },
            create: { id: 1, monetization_enabled: nextMonetizationEnabled },
        });

        const employerPlans = Array.isArray(body?.employer_plans)
            ? await updateEmployerSubscriptionPlanAmounts(body.employer_plans)
            : await getEmployerSubscriptionPlans();

        return NextResponse.json({
            message: "Settings updated",
            settings: {
                ...updated,
                employer_plans: employerPlans,
            },
        });
    } catch (error) {
        console.error("Admin settings update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
