export const EMPLOYER_PLAN_KEYS = ["starter", "growth", "elite"] as const;

export type EmployerPlanKey = (typeof EMPLOYER_PLAN_KEYS)[number];
export type EmployerBillingCycle = "monthly" | "yearly";

export interface EmployerSubscriptionPlan {
    key: EmployerPlanKey;
    name: string;
    description: string;
    monthlyAmount: number;
    yearlyDiscountPercent: number;
    currency: string;
    features: string[];
    canSourceCandidates: boolean;
    canContactCandidates: boolean;
    canAccessAiFeatures: boolean;
    sortOrder: number;
}

export interface EmployerSubscriptionRecord {
    employerId: string;
    planKey: EmployerPlanKey;
    billingCycle: EmployerBillingCycle;
    status: string;
    amount: number;
    currency: string;
    paymentProvider: string | null;
    paymentReference: string | null;
    purchaseMode: string;
    autoRenew: boolean;
    cancelAtPeriodEnd: boolean;
    nextBillingAt: string | null;
    endsAt: string | null;
    canceledAt: string | null;
    startedAt: string;
    updatedAt: string;
}

export interface EmployerSubscriptionCapabilities {
    hasActiveSubscription: boolean;
    canPostJobs: boolean;
    canSourceCandidates: boolean;
    canContactCandidates: boolean;
    canAccessAiFeatures: boolean;
}

export interface EmployerSubscriptionSnapshot {
    monetizationEnabled: boolean;
    plans: EmployerSubscriptionPlan[];
    activeSubscription: EmployerSubscriptionRecord | null;
    latestSubscription: EmployerSubscriptionRecord | null;
    activePlan: EmployerSubscriptionPlan | null;
    capabilities: EmployerSubscriptionCapabilities;
    purchaseMode: "manual_test";
}

export const DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS: EmployerSubscriptionPlan[] = [
    {
        key: "starter",
        name: "Starter",
        description: "Unlock direct candidate sourcing while keeping the core hiring platform free to use.",
        monthlyAmount: 1499,
        yearlyDiscountPercent: 10,
        currency: "INR",
        features: [
            "Direct candidate directory access",
            "View sourced candidate profiles",
            "Core employer workflow stays free outside premium sourcing",
        ],
        canSourceCandidates: true,
        canContactCandidates: false,
        canAccessAiFeatures: false,
        sortOrder: 1,
    },
    {
        key: "growth",
        name: "Growth",
        description: "For employers who want sourcing plus direct candidate outreach and resume access.",
        monthlyAmount: 3499,
        yearlyDiscountPercent: 15,
        currency: "INR",
        features: [
            "Everything in Starter",
            "Direct contact details for sourced candidates",
            "Resume download and outreach access",
        ],
        canSourceCandidates: true,
        canContactCandidates: true,
        canAccessAiFeatures: false,
        sortOrder: 2,
    },
    {
        key: "elite",
        name: "Elite",
        description: "Full premium sourcing with AI-powered discovery and best-candidate assistance.",
        monthlyAmount: 5999,
        yearlyDiscountPercent: 20,
        currency: "INR",
        features: [
            "Everything in Growth",
            "AI Top Candidates access",
            "Fresh Matches AI talent feed",
            "Premium best-candidate discovery tools",
        ],
        canSourceCandidates: true,
        canContactCandidates: true,
        canAccessAiFeatures: true,
        sortOrder: 3,
    },
];

export function getDefaultEmployerPlan(planKey: EmployerPlanKey) {
    return DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS.find((plan) => plan.key === planKey) || DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS[0];
}

export function getEmployerPlanAmount(plan: EmployerSubscriptionPlan, billingCycle: EmployerBillingCycle) {
    if (billingCycle === "yearly") {
        const yearlyBaseAmount = plan.monthlyAmount * 12;
        const discountedAmount = yearlyBaseAmount * (100 - plan.yearlyDiscountPercent) / 100;
        return Math.max(0, Math.round(discountedAmount));
    }

    return plan.monthlyAmount;
}
