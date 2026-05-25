"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EmployerSubscriptionPlans } from "@/components/employer/EmployerSubscriptionPlans";
import type {
    EmployerBillingCycle,
    EmployerPlanKey,
    EmployerSubscriptionRecord,
    EmployerSubscriptionSnapshot,
} from "@/lib/employer-subscription-config";

function formatPlanAmount(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency || "INR"} ${amount}`;
    }
}

function formatDate(value: string | null) {
    if (!value) return "Not scheduled";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export default function EmployerSubscriptionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<EmployerSubscriptionSnapshot | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [purchasingPlanKey, setPurchasingPlanKey] = useState<EmployerPlanKey | null>(null);
    const [actionLoading, setActionLoading] = useState<"" | "cancel_recurring" | "resume_recurring" | "cancel_now">("");

    const loadSnapshot = async () => {
        const profileRes = await fetch("/api/profile");
        if (!profileRes.ok) {
            router.push("/login");
            return null;
        }

        const profileData = await profileRes.json();
        if (profileData.user.role !== "employer") {
            router.push("/login");
            return null;
        }

        const subscriptionRes = await fetch("/api/employer/subscription");
        if (!subscriptionRes.ok) {
            const data = await subscriptionRes.json().catch(() => null);
            throw new Error(data?.error || "Unable to load subscription details.");
        }

        const data = await subscriptionRes.json();
        setSnapshot(data);
        return data as EmployerSubscriptionSnapshot;
    };

    useEffect(() => {
        async function init() {
            try {
                await loadSnapshot();
            } catch (error) {
                console.error(error);
                setMessage({ type: "error", text: "Unable to load subscription details right now." });
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [router]);

    const latestSubscription = snapshot?.latestSubscription || null;
    const activeSubscription = snapshot?.activeSubscription || null;
    const currentSubscription = activeSubscription || latestSubscription;
    const currentPlan = useMemo(() => {
        if (!snapshot || !currentSubscription) return null;
        return snapshot.plans.find((plan) => plan.key === currentSubscription.planKey) || null;
    }, [snapshot, currentSubscription]);

    const handlePurchase = async (planKey: EmployerPlanKey, billingCycle: EmployerBillingCycle) => {
        setPurchasingPlanKey(planKey);
        setMessage(null);

        try {
            const res = await fetch("/api/employer/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planKey, billingCycle }),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Unable to activate the subscription right now." });
                return;
            }

            setSnapshot(data.snapshot || null);
            setMessage({ type: "success", text: data.message || "Subscription activated successfully." });
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "Network error while activating the subscription." });
        } finally {
            setPurchasingPlanKey(null);
        }
    };

    const handleAction = async (action: "cancel_recurring" | "resume_recurring" | "cancel_now") => {
        if (action === "cancel_now" && !window.confirm("Cancel this subscription immediately? This will remove paid access right away.")) {
            return;
        }

        setActionLoading(action);
        setMessage(null);

        try {
            const res = await fetch("/api/employer/subscription", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Unable to update the subscription right now." });
                return;
            }

            setSnapshot(data.snapshot || null);
            setMessage({ type: "success", text: data.message || "Subscription updated successfully." });
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "Network error while updating the subscription." });
        } finally {
            setActionLoading("");
        }
    };

    const renderStatusLabel = (subscription: EmployerSubscriptionRecord | null) => {
        if (!subscription) return "No subscription";
        if (subscription.status === "cancelled") return "Cancelled";
        if (subscription.status === "expired") return "Expired";
        if (subscription.cancelAtPeriodEnd) return "Ends after current cycle";
        return "Active";
    };

    const renderStatusClasses = (subscription: EmployerSubscriptionRecord | null) => {
        if (!subscription) return "border-amber-500/20 bg-amber-500/10 text-amber-500";
        if (subscription.status === "cancelled" || subscription.status === "expired") return "border-red-500/20 bg-red-500/10 text-red-500";
        if (subscription.cancelAtPeriodEnd) return "border-blue-500/20 bg-blue-500/10 text-blue-500";
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background pt-20 pb-16">
                <div className="mx-auto flex max-w-6xl items-center justify-center px-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-20 pb-16 overflow-x-hidden">
            <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
            <div className="absolute left-0 bottom-0 h-80 w-80 rounded-full bg-primary/5 blur-[120px]" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link href="/employer-dashboard?tab=settings" className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground transition-all hover:text-foreground">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Profile
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                            Subscription <span className="text-primary">Control</span>
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground sm:text-base">
                            Review your employer plan, manage recurring billing, and upgrade when you want more sourcing, contact, or AI-powered hiring access.
                        </p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.24em] ${renderStatusClasses(currentSubscription)}`}>
                        {renderStatusLabel(currentSubscription)}
                    </div>
                </div>

                {message && (
                    <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        message.type === "success"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                            : "border-red-500/20 bg-red-500/10 text-red-500"
                    }`}>
                        {message.text}
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-8 overflow-hidden rounded-[30px] border border-border bg-card shadow-[0_24px_80px_-40px_rgba(255,122,0,0.25)]"
                >
                    <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-primary/5 px-6 py-6 sm:px-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Current Subscription</p>
                                <h2 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
                                    {currentPlan ? currentPlan.name : "No Active Plan"}
                                </h2>
                                <p className="mt-2 max-w-xl text-sm font-medium text-muted-foreground">
                                    {snapshot?.monetizationEnabled
                                        ? currentPlan?.description || "Choose a plan to unlock sourcing, contact access, and AI-powered hiring features."
                                        : "Admin has turned monetization off, so premium gating is currently removed across the employer experience."}
                                </p>
                            </div>

                            {currentPlan && currentSubscription && (
                                <div className="rounded-3xl border border-primary/20 bg-background/80 px-5 py-4 backdrop-blur">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Billing</p>
                                    <p className="mt-2 text-3xl font-black text-foreground">
                                        {formatPlanAmount(currentSubscription.amount, currentSubscription.currency)}
                                    </p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                                        {currentSubscription.billingCycle === "yearly" ? "Yearly plan" : "Monthly plan"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
                        {[
                            {
                                label: "Plan Status",
                                value: renderStatusLabel(currentSubscription),
                                helper: currentSubscription?.status === "active" ? "Premium access currently available" : "No premium access running",
                            },
                            {
                                label: currentSubscription?.cancelAtPeriodEnd ? "Access Until" : "Next Billing",
                                value: currentSubscription?.cancelAtPeriodEnd
                                    ? formatDate(currentSubscription.endsAt || currentSubscription.nextBillingAt)
                                    : formatDate(currentSubscription?.nextBillingAt || null),
                                helper: currentSubscription?.cancelAtPeriodEnd ? "Recurring billing has been disabled" : "Next automatic billing date",
                            },
                            {
                                label: "Recurring Billing",
                                value: currentSubscription?.autoRenew ? "Enabled" : "Disabled",
                                helper: currentSubscription?.autoRenew ? "Future billing remains active" : "No future recurring charge scheduled",
                            },
                            {
                                label: "Premium Scope",
                                value: currentPlan ? currentPlan.name : "Free Workflow",
                                helper: currentPlan ? "Your current employer plan level" : "Core employer tools stay available",
                            },
                        ].map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="rounded-2xl border border-border bg-background p-4"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                                <p className="mt-3 text-lg font-black text-foreground">{item.value}</p>
                                <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">{item.helper}</p>
                            </motion.div>
                        ))}
                    </div>

                    {currentPlan && (
                        <div className="border-t border-border px-6 py-6 sm:px-8">
                            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Included In This Plan</p>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {currentPlan.features.map((feature, index) => (
                                    <motion.div
                                        key={feature}
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.25, delay: index * 0.04 }}
                                        className="rounded-2xl border border-border bg-muted/30 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">{feature}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {snapshot?.monetizationEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.08 }}
                        className="mb-8 rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_70px_-48px_rgba(255,122,0,0.45)] sm:p-8"
                    >
                        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Manage Billing</p>
                                <h3 className="mt-1 text-2xl font-black text-foreground">Subscription Actions</h3>
                                <p className="mt-2 text-sm font-medium text-muted-foreground">
                                    Control your recurring billing or end the subscription immediately whenever you need to.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            {activeSubscription && !activeSubscription.cancelAtPeriodEnd && (
                                <button
                                    type="button"
                                    onClick={() => handleAction("cancel_recurring")}
                                    disabled={actionLoading !== ""}
                                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-500 transition-all hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {actionLoading === "cancel_recurring" ? "Updating..." : "Cancel Next Recurring Payment"}
                                </button>
                            )}

                            {activeSubscription && activeSubscription.cancelAtPeriodEnd && (
                                <button
                                    type="button"
                                    onClick={() => handleAction("resume_recurring")}
                                    disabled={actionLoading !== ""}
                                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-500 transition-all hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {actionLoading === "resume_recurring" ? "Updating..." : "Resume Recurring Payment"}
                                </button>
                            )}

                            {activeSubscription && (
                                <button
                                    type="button"
                                    onClick={() => handleAction("cancel_now")}
                                    disabled={actionLoading !== ""}
                                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-500 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {actionLoading === "cancel_now" ? "Cancelling..." : "Cancel Subscription Now"}
                                </button>
                            )}

                            {!activeSubscription && (
                                <a
                                    href="#subscription-plans"
                                    className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-black transition-all hover:shadow-[0_0_22px_rgba(255,122,0,0.28)]"
                                >
                                    Subscribe Now
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}

                <div id="subscription-plans">
                    {snapshot?.monetizationEnabled ? (
                        <EmployerSubscriptionPlans
                            snapshot={snapshot}
                            onPurchase={handlePurchase}
                            purchasingPlanKey={purchasingPlanKey}
                            title="Choose Your Employer Plan"
                            subtitle="Compare monthly and yearly billing, review the discounted annual pricing, and activate the plan that best fits your hiring workflow."
                        />
                    ) : (
                        <div className="rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Monetization Off</p>
                            <h3 className="mt-3 text-2xl font-black text-foreground">Subscriptions are currently disabled</h3>
                            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-muted-foreground">
                                Admin has turned monetization off right now, so employer subscriptions are not required and premium feature gating is temporarily removed.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
