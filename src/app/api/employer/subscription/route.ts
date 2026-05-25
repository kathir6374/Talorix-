import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import {
    cancelEmployerSubscriptionNow,
    getEmployerSubscriptionSnapshot,
    purchaseEmployerSubscription,
    resumeEmployerSubscriptionRenewal,
    scheduleEmployerSubscriptionCancellation,
} from "@/lib/employer-subscriptions";
import {
    EMPLOYER_PLAN_KEYS,
    type EmployerBillingCycle,
    type EmployerPlanKey,
} from "@/lib/employer-subscription-config";

function isEmployerPlanKey(value: unknown): value is EmployerPlanKey {
    return typeof value === "string" && EMPLOYER_PLAN_KEYS.includes(value as EmployerPlanKey);
}

function isEmployerBillingCycle(value: unknown): value is EmployerBillingCycle {
    return value === "monthly" || value === "yearly";
}

async function getEmployerSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) return null;

    const session = await verifyAuth(token.value);
    if (!session || session.role !== "employer") return null;

    return session;
}

export async function GET() {
    try {
        const session = await getEmployerSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await getEmployerSubscriptionSnapshot(session.userId);
        return NextResponse.json(snapshot);
    } catch (error) {
        console.error("Employer subscription GET error:", error);
        return NextResponse.json({ error: "Unable to load subscription details right now." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getEmployerSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        if (!isEmployerPlanKey(body?.planKey)) {
            return NextResponse.json({ error: "Please choose a valid employer subscription plan." }, { status: 400 });
        }
        if (!isEmployerBillingCycle(body?.billingCycle)) {
            return NextResponse.json({ error: "Please choose a valid billing cycle." }, { status: 400 });
        }

        const currentSnapshot = await getEmployerSubscriptionSnapshot(session.userId);
        if (!currentSnapshot.monetizationEnabled) {
            return NextResponse.json({ error: "Monetization is currently turned off by admin." }, { status: 400 });
        }

        const subscription = await purchaseEmployerSubscription(session.userId, body.planKey, body.billingCycle);
        const snapshot = await getEmployerSubscriptionSnapshot(session.userId);

        return NextResponse.json({
            message: `${body.billingCycle === "yearly" ? "Yearly" : "Monthly"} subscription activated in test mode. Razorpay can be connected later without changing this flow.`,
            subscription,
            snapshot,
        });
    } catch (error) {
        console.error("Employer subscription POST error:", error);
        return NextResponse.json({ error: "Unable to activate the subscription right now." }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getEmployerSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const action = typeof body?.action === "string" ? body.action : "";

        const currentSnapshot = await getEmployerSubscriptionSnapshot(session.userId);
        if (!currentSnapshot.monetizationEnabled) {
            return NextResponse.json({ error: "Monetization is currently turned off by admin." }, { status: 400 });
        }

        if (action === "cancel_recurring") {
            await scheduleEmployerSubscriptionCancellation(session.userId);
        } else if (action === "resume_recurring") {
            await resumeEmployerSubscriptionRenewal(session.userId);
        } else if (action === "cancel_now") {
            await cancelEmployerSubscriptionNow(session.userId);
        } else {
            return NextResponse.json({ error: "Please choose a valid subscription action." }, { status: 400 });
        }

        const snapshot = await getEmployerSubscriptionSnapshot(session.userId);

        return NextResponse.json({
            message:
                action === "cancel_recurring"
                    ? "Recurring payment has been cancelled for the next billing cycle."
                    : action === "resume_recurring"
                        ? "Recurring payment has been resumed successfully."
                        : "Your subscription has been cancelled successfully.",
            snapshot,
        });
    } catch (error) {
        console.error("Employer subscription PATCH error:", error);
        return NextResponse.json({ error: "Unable to update the subscription right now." }, { status: 500 });
    }
}
