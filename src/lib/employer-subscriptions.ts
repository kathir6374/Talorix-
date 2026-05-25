import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
    DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS,
    EMPLOYER_PLAN_KEYS,
    getEmployerPlanAmount,
    type EmployerBillingCycle,
    type EmployerPlanKey,
    type EmployerSubscriptionPlan,
    type EmployerSubscriptionRecord,
    type EmployerSubscriptionSnapshot,
    getDefaultEmployerPlan,
} from "@/lib/employer-subscription-config";

type PlanRow = {
    plan_key: string;
    name: string;
    description: string;
    amount: number;
    monthly_amount: number | null;
    yearly_discount_percent: number | null;
    currency: string;
    features: unknown;
    can_source_candidates: boolean | null;
    can_contact_candidates: boolean | null;
    can_access_ai_features: boolean | null;
    can_browse_candidates: boolean;
    can_access_fresh_matches: boolean;
    sort_order: number;
};

type SubscriptionRow = {
    employer_id: string;
    plan_key: string;
    billing_cycle: string | null;
    status: string;
    amount: number;
    currency: string;
    payment_provider: string | null;
    payment_reference: string | null;
    purchase_mode: string;
    auto_renew: boolean | null;
    cancel_at_period_end: boolean | null;
    next_billing_at: Date | string | null;
    ends_at: Date | string | null;
    canceled_at: Date | string | null;
    started_at: Date | string;
    updated_at: Date | string;
};

let ensureTablesPromise: Promise<void> | null = null;

function isEmployerPlanKey(value: string): value is EmployerPlanKey {
    return EMPLOYER_PLAN_KEYS.includes(value as EmployerPlanKey);
}

function isEmployerBillingCycle(value: string | null | undefined): value is EmployerBillingCycle {
    return value === "monthly" || value === "yearly";
}

function normalizeFeatures(value: unknown, fallback: string[]) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item)).filter(Boolean);
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item)).filter(Boolean);
            }
        } catch {
            return fallback;
        }
    }

    return fallback;
}

function normalizePlanRow(row: PlanRow): EmployerSubscriptionPlan {
    const fallback = getDefaultEmployerPlan(isEmployerPlanKey(row.plan_key) ? row.plan_key : "starter");
    const monthlyAmount = Number.isFinite(Number(row.monthly_amount)) && Number(row.monthly_amount) > 0
        ? Number(row.monthly_amount)
        : (Number.isFinite(Number(row.amount)) && Number(row.amount) > 0 ? Number(row.amount) : fallback.monthlyAmount);
    const yearlyDiscountPercent = Number.isFinite(Number(row.yearly_discount_percent))
        ? Math.max(0, Math.min(100, Number(row.yearly_discount_percent)))
        : fallback.yearlyDiscountPercent;

    return {
        key: isEmployerPlanKey(row.plan_key) ? row.plan_key : fallback.key,
        name: row.name || fallback.name,
        description: row.description || fallback.description,
        monthlyAmount,
        yearlyDiscountPercent,
        currency: row.currency || fallback.currency,
        features: normalizeFeatures(row.features, fallback.features),
        canSourceCandidates: row.can_source_candidates === null || row.can_source_candidates === undefined
            ? (row.can_browse_candidates ?? fallback.canSourceCandidates)
            : Boolean(row.can_source_candidates),
        canContactCandidates: row.can_contact_candidates === null || row.can_contact_candidates === undefined
            ? fallback.canContactCandidates
            : Boolean(row.can_contact_candidates),
        canAccessAiFeatures: row.can_access_ai_features === null || row.can_access_ai_features === undefined
            ? (row.can_access_fresh_matches ?? fallback.canAccessAiFeatures)
            : Boolean(row.can_access_ai_features),
        sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : fallback.sortOrder,
    };
}

function toIsoStringOrNull(value: Date | string | null | undefined) {
    if (!value) return null;
    return new Date(value).toISOString();
}

function getNextBillingDate(startedAt: Date, billingCycle: EmployerBillingCycle) {
    const nextBilling = new Date(startedAt);

    if (billingCycle === "yearly") {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    return nextBilling;
}

function normalizeSubscriptionRow(row: SubscriptionRow): EmployerSubscriptionRecord {
    const fallbackPlan = getDefaultEmployerPlan(isEmployerPlanKey(row.plan_key) ? row.plan_key : "starter");

    return {
        employerId: row.employer_id,
        planKey: isEmployerPlanKey(row.plan_key) ? row.plan_key : fallbackPlan.key,
        billingCycle: isEmployerBillingCycle(row.billing_cycle) ? row.billing_cycle : "monthly",
        status: row.status,
        amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : getEmployerPlanAmount(fallbackPlan, "monthly"),
        currency: row.currency || fallbackPlan.currency,
        paymentProvider: row.payment_provider,
        paymentReference: row.payment_reference,
        purchaseMode: row.purchase_mode || "manual_test",
        autoRenew: row.auto_renew ?? true,
        cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
        nextBillingAt: toIsoStringOrNull(row.next_billing_at),
        endsAt: toIsoStringOrNull(row.ends_at),
        canceledAt: toIsoStringOrNull(row.canceled_at),
        startedAt: new Date(row.started_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}

export async function ensureEmployerSubscriptionTables() {
    if (!ensureTablesPromise) {
        ensureTablesPromise = (async () => {
            await db.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS employer_subscription_plans (
                    plan_key TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    amount INTEGER NOT NULL DEFAULT 0,
                    monthly_amount INTEGER NOT NULL DEFAULT 0,
                    yearly_discount_percent INTEGER NOT NULL DEFAULT 0,
                    currency TEXT NOT NULL DEFAULT 'INR',
                    features JSONB NOT NULL DEFAULT '[]'::jsonb,
                    can_source_candidates BOOLEAN NOT NULL DEFAULT FALSE,
                    can_contact_candidates BOOLEAN NOT NULL DEFAULT FALSE,
                    can_access_ai_features BOOLEAN NOT NULL DEFAULT FALSE,
                    can_browse_candidates BOOLEAN NOT NULL DEFAULT FALSE,
                    can_access_fresh_matches BOOLEAN NOT NULL DEFAULT FALSE,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            await db.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS employer_subscriptions (
                    employer_id TEXT PRIMARY KEY,
                    plan_key TEXT NOT NULL,
                    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
                    status TEXT NOT NULL DEFAULT 'active',
                    amount INTEGER NOT NULL DEFAULT 0,
                    currency TEXT NOT NULL DEFAULT 'INR',
                    payment_provider TEXT NULL,
                    payment_reference TEXT NULL,
                    purchase_mode TEXT NOT NULL DEFAULT 'manual_test',
                    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
                    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
                    next_billing_at TIMESTAMPTZ NULL,
                    ends_at TIMESTAMPTZ NULL,
                    canceled_at TIMESTAMPTZ NULL,
                    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            await db.$executeRawUnsafe(`ALTER TABLE employer_subscription_plans ADD COLUMN IF NOT EXISTS monthly_amount INTEGER NOT NULL DEFAULT 0`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscription_plans ADD COLUMN IF NOT EXISTS yearly_discount_percent INTEGER NOT NULL DEFAULT 0`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscription_plans ADD COLUMN IF NOT EXISTS can_source_candidates BOOLEAN NOT NULL DEFAULT FALSE`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscription_plans ADD COLUMN IF NOT EXISTS can_contact_candidates BOOLEAN NOT NULL DEFAULT FALSE`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscription_plans ADD COLUMN IF NOT EXISTS can_access_ai_features BOOLEAN NOT NULL DEFAULT FALSE`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT TRUE`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ NULL`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NULL`);
            await db.$executeRawUnsafe(`ALTER TABLE employer_subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL`);

            for (const plan of DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS) {
                await db.$executeRaw(
                    Prisma.sql`
                        INSERT INTO employer_subscription_plans (
                            plan_key,
                            name,
                            description,
                            amount,
                            monthly_amount,
                            yearly_discount_percent,
                            currency,
                            features,
                            can_source_candidates,
                            can_contact_candidates,
                            can_access_ai_features,
                            can_browse_candidates,
                            can_access_fresh_matches,
                            sort_order
                        )
                        VALUES (
                            ${plan.key},
                            ${plan.name},
                            ${plan.description},
                            ${plan.monthlyAmount},
                            ${plan.monthlyAmount},
                            ${plan.yearlyDiscountPercent},
                            ${plan.currency},
                            ${JSON.stringify(plan.features)}::jsonb,
                            ${plan.canSourceCandidates},
                            ${plan.canContactCandidates},
                            ${plan.canAccessAiFeatures},
                            ${plan.canSourceCandidates},
                            ${plan.canAccessAiFeatures},
                            ${plan.sortOrder}
                        )
                        ON CONFLICT (plan_key) DO UPDATE
                        SET
                            name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            features = EXCLUDED.features,
                            can_source_candidates = EXCLUDED.can_source_candidates,
                            can_contact_candidates = EXCLUDED.can_contact_candidates,
                            can_access_ai_features = EXCLUDED.can_access_ai_features,
                            can_browse_candidates = EXCLUDED.can_browse_candidates,
                            can_access_fresh_matches = EXCLUDED.can_access_fresh_matches,
                            sort_order = EXCLUDED.sort_order,
                            updated_at = NOW()
                    `
                );

                await db.$executeRaw(
                    Prisma.sql`
                        UPDATE employer_subscription_plans
                        SET
                            monthly_amount = CASE WHEN monthly_amount = 0 THEN ${plan.monthlyAmount} ELSE monthly_amount END,
                            yearly_discount_percent = CASE WHEN yearly_discount_percent = 0 THEN ${plan.yearlyDiscountPercent} ELSE yearly_discount_percent END
                        WHERE plan_key = ${plan.key}
                    `
                );
            }
        })().catch((error) => {
            ensureTablesPromise = null;
            throw error;
        });
    }

    await ensureTablesPromise;
}

export async function getEmployerSubscriptionPlans() {
    await ensureEmployerSubscriptionTables();

    const rows = await db.$queryRaw<PlanRow[]>`
        SELECT
            plan_key,
            name,
            description,
            amount,
            monthly_amount,
            yearly_discount_percent,
            currency,
            features,
            can_source_candidates,
            can_contact_candidates,
            can_access_ai_features,
            can_browse_candidates,
            can_access_fresh_matches,
            sort_order
        FROM employer_subscription_plans
        ORDER BY sort_order ASC
    `;

    const normalized = rows.map(normalizePlanRow);

    if (normalized.length === DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS.length) {
        return normalized;
    }

    const presentKeys = new Set(normalized.map((plan) => plan.key));
    const missingDefaults = DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS.filter((plan) => !presentKeys.has(plan.key));
    return [...normalized, ...missingDefaults].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateEmployerSubscriptionPlanAmounts(
    plans: Array<Pick<EmployerSubscriptionPlan, "key" | "monthlyAmount" | "yearlyDiscountPercent" | "currency">>
) {
    await ensureEmployerSubscriptionTables();

    for (const plan of plans) {
        if (!isEmployerPlanKey(plan.key)) continue;

        const safeMonthlyAmount = Math.max(0, Math.round(Number(plan.monthlyAmount) || 0));
        const safeYearlyDiscountPercent = Math.max(0, Math.min(100, Math.round(Number(plan.yearlyDiscountPercent) || 0)));
        const safeCurrency = (plan.currency || "INR").trim().toUpperCase() || "INR";

        await db.$executeRaw(
            Prisma.sql`
                UPDATE employer_subscription_plans
                SET amount = ${safeMonthlyAmount},
                    monthly_amount = ${safeMonthlyAmount},
                    yearly_discount_percent = ${safeYearlyDiscountPercent},
                    currency = ${safeCurrency},
                    updated_at = NOW()
                WHERE plan_key = ${plan.key}
            `
        );
    }

    return getEmployerSubscriptionPlans();
}

export async function getEmployerSubscriptionRecord(employerId: string) {
    await ensureEmployerSubscriptionTables();

    const rows = await db.$queryRaw<SubscriptionRow[]>(
        Prisma.sql`
            SELECT
                employer_id,
                plan_key,
                billing_cycle,
                status,
                amount,
                currency,
                payment_provider,
                payment_reference,
                purchase_mode,
                auto_renew,
                cancel_at_period_end,
                next_billing_at,
                ends_at,
                canceled_at,
                started_at,
                updated_at
            FROM employer_subscriptions
            WHERE employer_id = ${employerId}
            LIMIT 1
        `
    );

    if (!rows[0]) return null;

    let subscription = normalizeSubscriptionRow(rows[0]);

    if (
        subscription.status.toLowerCase() === "active" &&
        subscription.cancelAtPeriodEnd &&
        subscription.nextBillingAt &&
        new Date(subscription.nextBillingAt).getTime() <= Date.now()
    ) {
        await db.$executeRaw(
            Prisma.sql`
                UPDATE employer_subscriptions
                SET
                    status = ${"expired"},
                    auto_renew = FALSE,
                    cancel_at_period_end = FALSE,
                    ends_at = COALESCE(ends_at, ${new Date(subscription.nextBillingAt)}),
                    updated_at = NOW()
                WHERE employer_id = ${employerId}
            `
        );

        return getEmployerSubscriptionRecord(employerId);
    }

    return subscription;
}

export async function getEmployerActiveSubscription(employerId: string) {
    const subscription = await getEmployerSubscriptionRecord(employerId);
    if (!subscription) return null;
    if (subscription.status.toLowerCase() !== "active") return null;
    return subscription;
}

export async function purchaseEmployerSubscription(employerId: string, planKey: EmployerPlanKey, billingCycle: EmployerBillingCycle) {
    await ensureEmployerSubscriptionTables();

    const plans = await getEmployerSubscriptionPlans();
    const selectedPlan = plans.find((plan) => plan.key === planKey);

    if (!selectedPlan) {
        throw new Error("Selected subscription plan was not found.");
    }

    const paymentReference = `manual-test-${Date.now()}`;
    const chargedAmount = getEmployerPlanAmount(selectedPlan, billingCycle);
    const startedAt = new Date();
    const nextBillingAt = getNextBillingDate(startedAt, billingCycle);

    await db.$executeRaw(
        Prisma.sql`
            INSERT INTO employer_subscriptions (
                employer_id,
                plan_key,
                billing_cycle,
                status,
                amount,
                currency,
                payment_provider,
                payment_reference,
                purchase_mode,
                auto_renew,
                cancel_at_period_end,
                next_billing_at,
                ends_at,
                canceled_at,
                started_at,
                updated_at
            )
            VALUES (
                ${employerId},
                ${selectedPlan.key},
                ${billingCycle},
                ${"active"},
                ${chargedAmount},
                ${selectedPlan.currency},
                ${"razorpay_pending"},
                ${paymentReference},
                ${"manual_test"},
                ${true},
                ${false},
                ${nextBillingAt},
                ${null},
                ${null},
                ${startedAt},
                ${startedAt}
            )
            ON CONFLICT (employer_id) DO UPDATE
            SET
                plan_key = EXCLUDED.plan_key,
                billing_cycle = EXCLUDED.billing_cycle,
                status = EXCLUDED.status,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                payment_provider = EXCLUDED.payment_provider,
                payment_reference = EXCLUDED.payment_reference,
                purchase_mode = EXCLUDED.purchase_mode,
                auto_renew = EXCLUDED.auto_renew,
                cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                next_billing_at = EXCLUDED.next_billing_at,
                ends_at = EXCLUDED.ends_at,
                canceled_at = EXCLUDED.canceled_at,
                started_at = EXCLUDED.started_at,
                updated_at = EXCLUDED.updated_at
        `
    );

    return getEmployerActiveSubscription(employerId);
}

export async function scheduleEmployerSubscriptionCancellation(employerId: string) {
    const subscription = await getEmployerActiveSubscription(employerId);
    if (!subscription) {
        throw new Error("No active subscription found to update.");
    }

    const nextBillingAt = subscription.nextBillingAt
        ? new Date(subscription.nextBillingAt)
        : getNextBillingDate(new Date(subscription.startedAt), subscription.billingCycle);

    await db.$executeRaw(
        Prisma.sql`
            UPDATE employer_subscriptions
            SET
                auto_renew = FALSE,
                cancel_at_period_end = TRUE,
                ends_at = ${nextBillingAt},
                canceled_at = NOW(),
                updated_at = NOW()
            WHERE employer_id = ${employerId}
        `
    );

    return getEmployerSubscriptionRecord(employerId);
}

export async function resumeEmployerSubscriptionRenewal(employerId: string) {
    const subscription = await getEmployerSubscriptionRecord(employerId);
    if (!subscription || subscription.status.toLowerCase() !== "active") {
        throw new Error("No active subscription found to resume.");
    }

    const nextBillingAt = subscription.nextBillingAt
        ? new Date(subscription.nextBillingAt)
        : getNextBillingDate(new Date(subscription.startedAt), subscription.billingCycle);

    await db.$executeRaw(
        Prisma.sql`
            UPDATE employer_subscriptions
            SET
                auto_renew = TRUE,
                cancel_at_period_end = FALSE,
                next_billing_at = ${nextBillingAt},
                ends_at = NULL,
                canceled_at = NULL,
                updated_at = NOW()
            WHERE employer_id = ${employerId}
        `
    );

    return getEmployerSubscriptionRecord(employerId);
}

export async function cancelEmployerSubscriptionNow(employerId: string) {
    const subscription = await getEmployerSubscriptionRecord(employerId);
    if (!subscription) {
        throw new Error("No subscription record found to cancel.");
    }

    const canceledAt = new Date();

    await db.$executeRaw(
        Prisma.sql`
            UPDATE employer_subscriptions
            SET
                status = ${"cancelled"},
                auto_renew = FALSE,
                cancel_at_period_end = FALSE,
                next_billing_at = NULL,
                ends_at = ${canceledAt},
                canceled_at = ${canceledAt},
                updated_at = NOW()
            WHERE employer_id = ${employerId}
        `
    );

    return getEmployerSubscriptionRecord(employerId);
}

export async function getEmployerSubscriptionSnapshot(employerId: string): Promise<EmployerSubscriptionSnapshot> {
    await ensureEmployerSubscriptionTables();

    const [plans, latestSubscription, activeSubscription, settings] = await Promise.all([
        getEmployerSubscriptionPlans(),
        getEmployerSubscriptionRecord(employerId),
        getEmployerActiveSubscription(employerId),
        db.systemSettings.findUnique({ where: { id: 1 } }),
    ]);

    const monetizationEnabled = settings?.monetization_enabled ?? false;

    if (!monetizationEnabled) {
        return {
            monetizationEnabled: false,
            plans,
            activeSubscription,
            latestSubscription,
            activePlan: activeSubscription ? plans.find((plan) => plan.key === activeSubscription.planKey) || null : null,
            capabilities: {
                hasActiveSubscription: Boolean(activeSubscription),
                canPostJobs: true,
                canSourceCandidates: true,
                canContactCandidates: true,
                canAccessAiFeatures: true,
            },
            purchaseMode: "manual_test",
        };
    }

    const activePlan = activeSubscription
        ? plans.find((plan) => plan.key === activeSubscription.planKey) || null
        : null;

    return {
        monetizationEnabled: true,
        plans,
        activeSubscription,
        latestSubscription,
        activePlan,
        capabilities: {
            hasActiveSubscription: Boolean(activeSubscription && activePlan),
            canPostJobs: true,
            canSourceCandidates: Boolean(activePlan?.canSourceCandidates),
            canContactCandidates: Boolean(activePlan?.canContactCandidates),
            canAccessAiFeatures: Boolean(activePlan?.canAccessAiFeatures),
        },
        purchaseMode: "manual_test",
    };
}

export async function employerHasCandidateRelationship(employerId: string, candidateId: string) {
    const relationship = await db.application.findFirst({
        where: {
            candidate_id: candidateId,
            job: {
                posted_by: employerId,
            },
        },
        select: { id: true },
    });

    return Boolean(relationship);
}

export async function getEmployerCandidateAccess(employerId: string, candidateId: string) {
    const subscription = await getEmployerSubscriptionSnapshot(employerId);
    const hasExistingRelationship = await employerHasCandidateRelationship(employerId, candidateId);

    if (!subscription.monetizationEnabled) {
        return {
            hasExistingRelationship,
            canViewProfile: true,
            canAccessContact: true,
        };
    }

    if (hasExistingRelationship) {
        return {
            hasExistingRelationship,
            canViewProfile: true,
            canAccessContact: true,
        };
    }

    return {
        hasExistingRelationship,
        canViewProfile: subscription.capabilities.canSourceCandidates,
        canAccessContact: subscription.capabilities.canContactCandidates,
    };
}

export async function employerCanAccessCandidateProfile(employerId: string, candidateId: string) {
    const access = await getEmployerCandidateAccess(employerId, candidateId);
    return access.canViewProfile;
}
