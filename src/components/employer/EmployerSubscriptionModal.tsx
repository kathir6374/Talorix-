"use client";

import { EmployerSubscriptionPlans } from "@/components/employer/EmployerSubscriptionPlans";
import type {
    EmployerBillingCycle,
    EmployerPlanKey,
    EmployerSubscriptionSnapshot,
} from "@/lib/employer-subscription-config";

export function EmployerSubscriptionModal({
    isOpen,
    onClose,
    snapshot,
    onPurchase,
    purchasingPlanKey,
    message,
    title,
    subtitle,
}: {
    isOpen: boolean;
    onClose: () => void;
    snapshot: EmployerSubscriptionSnapshot | null;
    onPurchase: (planKey: EmployerPlanKey, billingCycle: EmployerBillingCycle) => void;
    purchasingPlanKey: EmployerPlanKey | null;
    message: { type: "success" | "error"; text: string } | null;
    title: string;
    subtitle: string;
}) {
    if (!isOpen || !snapshot?.monetizationEnabled) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="Close subscription plans"
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-border bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Premium Access</p>
                        <h2 className="mt-1 text-xl font-black text-foreground sm:text-2xl">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground"
                    >
                        Close
                    </button>
                </div>

                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5 sm:p-6">
                    {message && (
                        <div
                            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                message.type === "success"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                    : "border-red-500/20 bg-red-500/10 text-red-500"
                            }`}
                        >
                            {message.text}
                        </div>
                    )}

                    <EmployerSubscriptionPlans
                        snapshot={snapshot}
                        onPurchase={onPurchase}
                        purchasingPlanKey={purchasingPlanKey}
                        title={title}
                        subtitle={subtitle}
                    />
                </div>
            </div>
        </div>
    );
}
