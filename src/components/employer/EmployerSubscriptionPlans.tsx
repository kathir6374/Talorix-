"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type {
    EmployerBillingCycle,
    EmployerPlanKey,
    EmployerSubscriptionSnapshot,
} from "@/lib/employer-subscription-config";
import { getEmployerPlanAmount } from "@/lib/employer-subscription-config";

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

function getYearlyBaseAmount(monthlyAmount: number) {
    return monthlyAmount * 12;
}

export function EmployerSubscriptionPlans({
    snapshot,
    onPurchase,
    purchasingPlanKey,
    title = "Employer Subscription Plans",
    subtitle = "Razorpay-ready plans are configured by admin. For now, clicking purchase activates the plan instantly in test mode.",
}: {
    snapshot: EmployerSubscriptionSnapshot | null;
    onPurchase: (planKey: EmployerPlanKey, billingCycle: EmployerBillingCycle) => void;
    purchasingPlanKey: EmployerPlanKey | null;
    title?: string;
    subtitle?: string;
}) {
    if (!snapshot || !snapshot.monetizationEnabled) {
        return null;
    }

    const activePlanKey = snapshot.activePlan?.key || null;
    const [billingCycle, setBillingCycle] = useState<EmployerBillingCycle>("monthly");

    return (
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                    <h3 className="text-lg font-black text-foreground tracking-tight">{title}</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1 max-w-3xl">{subtitle}</p>
                </div>
                <div className={`rounded-xl border px-3.5 py-2 text-xs font-black uppercase tracking-wider ${
                    snapshot.capabilities.hasActiveSubscription
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                }`}>
                    {snapshot.capabilities.hasActiveSubscription
                        ? `${snapshot.activePlan?.name || "Plan"} ${snapshot.activeSubscription?.billingCycle === "yearly" ? "Yearly" : "Monthly"}`
                        : "No Active Plan"}
                </div>
            </div>

            <div className="mb-5 inline-flex rounded-xl border border-border p-1 bg-muted/30">
                {(["monthly", "yearly"] as EmployerBillingCycle[]).map((cycle) => (
                    <motion.button
                        key={cycle}
                        type="button"
                        onClick={() => setBillingCycle(cycle)}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            billingCycle === cycle
                                ? "bg-primary text-black shadow-[0_10px_20px_-12px_rgba(255,122,0,0.8)]"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {cycle === "monthly" ? "Monthly" : "Yearly"}
                    </motion.button>
                ))}
            </div>

            {snapshot.capabilities.hasActiveSubscription && (
                <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Current Access</p>
                    <div className="flex flex-wrap gap-3 text-sm font-semibold text-foreground">
                        <span className="rounded-full bg-background border border-border px-3 py-1">
                            Candidate sourcing: {snapshot.capabilities.canSourceCandidates ? "Unlocked" : "Locked"}
                        </span>
                        <span className="rounded-full bg-background border border-border px-3 py-1">
                            Contact details: {snapshot.capabilities.canContactCandidates ? "Unlocked" : "Locked"}
                        </span>
                        <span className="rounded-full bg-background border border-border px-3 py-1">
                            AI features: {snapshot.capabilities.canAccessAiFeatures ? "Unlocked" : "Locked"}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {snapshot.plans.map((plan, index) => {
                    const isActive = plan.key === activePlanKey;
                    const isPurchasing = purchasingPlanKey === plan.key;
                    const yearlyBaseAmount = getYearlyBaseAmount(plan.monthlyAmount);
                    const displayedAmount = getEmployerPlanAmount(plan, billingCycle);
                    const yearlySavings = yearlyBaseAmount - getEmployerPlanAmount(plan, "yearly");
                    const isFeatured = plan.key === "growth";

                    return (
                        <motion.div
                            key={plan.key}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.06 }}
                            whileHover={{ y: -8, scale: 1.01 }}
                            whileTap={{ scale: 0.995 }}
                            className={`rounded-2xl border p-5 transition-all ${
                                isActive
                                    ? "border-primary bg-primary/5 shadow-[0_18px_38px_-24px_rgba(255,122,0,0.65)]"
                                    : isFeatured
                                        ? "border-primary/30 bg-background shadow-[0_14px_30px_-24px_rgba(255,122,0,0.45)]"
                                        : "border-border bg-background hover:border-primary/25 hover:shadow-[0_16px_32px_-26px_rgba(255,122,0,0.35)]"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">{plan.name}</p>
                                        {isFeatured && !isActive && (
                                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                                Popular
                                            </span>
                                        )}
                                    </div>
                                    {billingCycle === "yearly" && (
                                        <p className="text-sm font-black text-muted-foreground/80 line-through">
                                            {formatPlanAmount(yearlyBaseAmount, plan.currency)}
                                        </p>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <h4 className="text-2xl font-black text-foreground tracking-tight">
                                            {formatPlanAmount(displayedAmount, plan.currency)}
                                        </h4>
                                        {billingCycle === "yearly" && (
                                            <span className="mb-0.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500">
                                                Save {formatPlanAmount(yearlySavings, plan.currency)}
                                            </span>
                                        )}
                                    </div>
                                    {billingCycle === "yearly" ? (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <p className="text-xs text-primary font-bold">
                                                {plan.yearlyDiscountPercent}% yearly discount applied
                                            </p>
                                            <span className="text-[11px] font-bold text-muted-foreground">
                                                Billed yearly
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground font-bold mt-1">Per month</p>
                                    )}
                                    <p className="text-sm text-muted-foreground font-medium mt-2">{plan.description}</p>
                                </div>
                                {isActive && (
                                    <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                        Current
                                    </span>
                                )}
                            </div>

                            <ul className="space-y-2.5 mb-5">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground font-medium">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <motion.button
                                type="button"
                                onClick={() => onPurchase(plan.key, billingCycle)}
                                disabled={isActive || isPurchasing}
                                whileTap={isActive || isPurchasing ? undefined : { scale: 0.98 }}
                                className={`w-full rounded-xl py-3 text-sm font-black transition-all ${
                                    isActive
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-black hover:shadow-[0_0_20px_rgba(255,122,0,0.25)] active:scale-[0.98]"
                                } ${isPurchasing ? "opacity-70 cursor-wait" : ""}`}
                            >
                                {isActive ? "Current Plan" : isPurchasing ? "Activating..." : `Purchase ${billingCycle === "yearly" ? "Yearly" : "Monthly"} Plan`}
                            </motion.button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
