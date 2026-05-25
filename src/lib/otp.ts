import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { getLastEmailError, sendOTPEmail, sendPasswordResetEmail } from "./email";
import { isWhatsAppConfigured, sendWhatsAppOTP } from "./whatsapp";

export const OTP_SESSION_COOKIE = "otp_session";

type OtpPurpose = "signup" | "account_verification" | "password_reset";
type OtpSendMethod = "email" | "phone" | "whatsapp" | "both";
type PendingSignupMetadata = {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string;
    role: string;
};

type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string; status: number };

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_RESEND_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_RESEND_COOLDOWN_MS = 30 * 1000;
const VERIFY_RESEND_COOLDOWN_MS = 30 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

let otpDbReady = false;
let otpBackendLogged = false;

function ok<T>(data: T): Result<T> {
    return { success: true, data };
}

function fail<T>(error: string, status = 400): Result<T> {
    return { success: false, error, status };
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    return `${hasPlus ? "+" : "+"}${digits}`;
}

function isValidEmail(email: string) {
    return EMAIL_REGEX.test(email);
}

function isValidPhone(phone: string) {
    return PHONE_REGEX.test(phone);
}

function isTwilioConfigured() {
    return !!(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM_NUMBER?.trim()
    );
}

export function isPhoneOtpProviderConfigured() {
    return isTwilioConfigured() || isWhatsAppConfigured();
}

function canUsePhoneOtp(phone?: string | null) {
    return !!phone && isPhoneOtpProviderConfigured();
}

function getEffectiveOtpSendMethod(input: {
    method: OtpSendMethod;
    email?: string | null;
    phone?: string | null;
}) {
    const { method, email, phone } = input;

    if ((method === "both" || method === "phone" || method === "whatsapp") && !canUsePhoneOtp(phone) && email) {
        console.log("[OTP] Phone OTP provider is not configured. Falling back to email-only OTP delivery.", {
            requestedMethod: method,
        });
        return "email" as const;
    }

    return method;
}

function shouldUseDevelopmentOtpFallback() {
    return process.env.NODE_ENV !== "production";
}

function generateOtpCode() {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH - 1;
    return crypto.randomInt(min, max + 1).toString();
}

function hashOtp(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function getOtpExpiryDate() {
    return new Date(Date.now() + OTP_EXPIRY_MS);
}

function getCooldownMs(purpose: OtpPurpose) {
    if (purpose === "password_reset") {
        return RESET_RESEND_COOLDOWN_MS;
    }

    if (purpose === "signup") {
        return SIGNUP_RESEND_COOLDOWN_MS;
    }

    return VERIFY_RESEND_COOLDOWN_MS;
}

function parsePendingSignupMetadata(value: unknown): PendingSignupMetadata | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const metadata = value as Record<string, unknown>;

    if (
        typeof metadata.name !== "string" ||
        typeof metadata.email !== "string" ||
        (metadata.phone !== null && typeof metadata.phone !== "string") ||
        typeof metadata.passwordHash !== "string" ||
        typeof metadata.role !== "string"
    ) {
        return null;
    }

    return {
        name: metadata.name,
        email: metadata.email,
        phone: metadata.phone as string | null,
        passwordHash: metadata.passwordHash,
        role: metadata.role,
    };
}

async function ensureOtpInfrastructure() {
    if (!otpBackendLogged) {
        if (process.env.REDIS_URL) {
            console.log("[OTP] REDIS_URL detected, but PostgreSQL OTP storage is active for this deployment.");
        } else {
            console.log("[OTP] Redis not configured. Using PostgreSQL OTP storage.");
        }
        otpBackendLogged = true;
    }

    if (!otpDbReady) {
        try {
            await db.$connect();
            otpDbReady = true;
            console.log("[OTP] PostgreSQL connected for OTP storage.");
        } catch (error) {
            console.error("[OTP] Failed to connect to PostgreSQL for OTP storage.", error);
            return false;
        }
    }

    return true;
}

async function cleanupExpiredOtpSessions() {
    try {
        await db.otpSession.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: new Date() } },
                    { consumed_at: { not: null } },
                ],
            },
        });
    } catch (error) {
        console.error("[OTP] Failed to clean up expired OTP sessions.", error);
    }
}

async function sendPhoneOtp(phone: string, otp: string) {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();

    if (isTwilioConfigured() && twilioSid && twilioToken && twilioFrom) {
        try {
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        To: phone,
                        From: twilioFrom,
                        Body: `Your Talorix OTP is ${otp}. It expires in 5 minutes.`,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[OTP] Twilio SMS delivery failed.", { phone, errorText });
                return false;
            }

            console.log("[OTP] OTP SMS sent successfully via Twilio.", { phone });
            return true;
        } catch (error) {
            console.error("[OTP] Twilio SMS request failed.", error);
            return false;
        }
    }

    if (isWhatsAppConfigured()) {
        const sent = await sendWhatsAppOTP(phone, otp);
        if (sent) {
            console.log("[OTP] OTP sent successfully via WhatsApp.", { phone });
        } else {
            console.error("[OTP] WhatsApp OTP delivery failed.", { phone });
        }
        return sent;
    }

    console.error("[OTP] No phone OTP provider is configured.");
    return false;
}

async function deliverOtpCode(options: {
    purpose: OtpPurpose;
    otp: string;
    email?: string | null;
    phone?: string | null;
    method: OtpSendMethod;
}) {
    const { purpose, otp, email, phone, method } = options;
    const effectiveMethod = getEffectiveOtpSendMethod({ method, email, phone });
    const shouldSendEmail = effectiveMethod === "both" || effectiveMethod === "email";
    const shouldSendPhone =
        effectiveMethod === "both" || effectiveMethod === "phone" || effectiveMethod === "whatsapp";

    if (shouldSendEmail && !email) {
        return fail<{ sentVia: "email" | "whatsapp" | "both" }>("No email address is available for OTP delivery.", 400);
    }

    if (shouldSendPhone && !phone) {
        return fail<{ sentVia: "email" | "whatsapp" | "both" }>("No phone number is available for OTP delivery.", 400);
    }

    try {
        const [initialEmailSent, phoneSent] = await Promise.all([
            shouldSendEmail && email
                ? purpose === "password_reset"
                    ? sendPasswordResetEmail(email, otp)
                    : sendOTPEmail(email, otp)
                : Promise.resolve(true),
            shouldSendPhone && phone ? sendPhoneOtp(phone, otp) : Promise.resolve(true),
        ]);

        const emailError = getLastEmailError();
        const emailSent = initialEmailSent || !shouldSendEmail || !email
            ? initialEmailSent
            : shouldUseDevelopmentOtpFallback();

        if (shouldSendEmail && email && !initialEmailSent && shouldUseDevelopmentOtpFallback()) {
            console.warn("[OTP] Email delivery failed in development. Using logged OTP fallback.", {
                purpose,
                email,
                otp,
                emailError,
            });
        }

        if (shouldSendEmail && !emailSent) {
            console.error("[OTP] OTP email delivery failed.", { purpose, email, emailError });
            return fail<{ sentVia: "email" | "whatsapp" | "both" }>(
                emailError || "Unable to send the OTP email right now.",
                503
            );
        }

        if (shouldSendPhone && !phoneSent) {
            console.error("[OTP] OTP phone delivery failed.", { purpose, phone });
            return fail<{ sentVia: "email" | "whatsapp" | "both" }>("Unable to send the OTP to the phone number right now.", 503);
        }

        const sentVia =
            shouldSendEmail && shouldSendPhone
                ? "both"
                : shouldSendPhone
                    ? "whatsapp"
                    : "email";

        console.log("[OTP] OTP sent successfully.", { purpose, sentVia, email, phone });
        return ok({ sentVia });
    } catch (error) {
        console.error("[OTP] Unexpected OTP delivery failure.", error);
        return fail<{ sentVia: "email" | "whatsapp" | "both" }>("Unable to send the OTP right now.", 503);
    }
}

async function enforceRateLimit(input: {
    purpose: OtpPurpose;
    email?: string | null;
    phone?: string | null;
    userId?: string | null;
}) {
    const filters: Array<{ email?: string; phone?: string; user_id?: string }> = [];

    if (input.email) {
        filters.push({ email: input.email });
    }

    if (input.phone) {
        filters.push({ phone: input.phone });
    }

    if (input.userId) {
        filters.push({ user_id: input.userId });
    }

    if (filters.length === 0) {
        return ok(true);
    }

    try {
        const recentRequests = await db.otpSession.count({
            where: {
                purpose: input.purpose,
                created_at: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
                OR: filters,
            },
        });

        if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
            return fail<boolean>("Too many OTP requests. Please wait a few minutes and try again.", 429);
        }

        return ok(true);
    } catch (error) {
        console.error("[OTP] Failed to enforce OTP rate limit.", error);
        return fail<boolean>("Unable to process the OTP request right now.", 503);
    }
}

async function markInvalidAttempt(sessionId: string, attempts: number) {
    try {
        if (attempts + 1 >= MAX_VERIFY_ATTEMPTS) {
            await db.otpSession.delete({
                where: { id: sessionId },
            });
            return;
        }

        await db.otpSession.update({
            where: { id: sessionId },
            data: { verify_attempts: { increment: 1 } },
        });
    } catch (error) {
        console.error("[OTP] Failed to update OTP verification attempts.", error);
    }
}

async function storeFreshSession(input: {
    purpose: OtpPurpose;
    email?: string | null;
    phone?: string | null;
    userId?: string | null;
    metadata?: PendingSignupMetadata | null;
}) {
    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);
    const sessionFilters: Array<{ email?: string; user_id?: string }> = [];

    if (input.userId) {
        sessionFilters.push({ user_id: input.userId });
    }

    if (input.email) {
        sessionFilters.push({ email: input.email });
    }

    try {
        await db.otpSession.deleteMany({
            where: {
                purpose: input.purpose,
                consumed_at: null,
                OR: sessionFilters,
            },
        });

        const session = await db.otpSession.create({
            data: {
                purpose: input.purpose,
                user_id: input.userId ?? null,
                email: input.email ?? null,
                phone: input.phone ?? null,
                otp_hash: otpHash,
                expires_at: getOtpExpiryDate(),
                last_sent_at: new Date(),
                metadata: input.metadata ?? undefined,
            },
        });

        return ok({ session, otp });
    } catch (error) {
        console.error("[OTP] Failed to create OTP session.", error);
        return fail<{ session: { id: string }; otp: string }>("Unable to create the OTP session right now.", 503);
    }
}

async function refreshExistingSession(input: {
    sessionId: string;
    purpose: OtpPurpose;
}) {
    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);

    try {
        const session = await db.otpSession.findUnique({
            where: { id: input.sessionId },
        });

        if (!session || session.purpose !== input.purpose || session.consumed_at) {
            return fail<{ session: typeof session; otp: string }>("OTP session not found.", 404);
        }

        if (session.resend_count >= MAX_RESEND_ATTEMPTS) {
            return fail<{ session: typeof session; otp: string }>("Resend limit reached. Please start again.", 429);
        }

        const cooldownMs = getCooldownMs(input.purpose);
        const nextAllowedSend = session.last_sent_at.getTime() + cooldownMs;

        if (nextAllowedSend > Date.now()) {
            return fail<{ session: typeof session; otp: string }>(
                `Please wait ${Math.ceil((nextAllowedSend - Date.now()) / 1000)} seconds before requesting another OTP.`,
                429
            );
        }

        const updatedSession = await db.otpSession.update({
            where: { id: input.sessionId },
            data: {
                otp_hash: otpHash,
                expires_at: getOtpExpiryDate(),
                last_sent_at: new Date(),
                resend_count: { increment: 1 },
                verify_attempts: 0,
            },
        });

        return ok({ session: updatedSession, otp });
    } catch (error) {
        console.error("[OTP] Failed to refresh OTP session.", error);
        return fail<{ session: null; otp: string }>("Unable to resend the OTP right now.", 503);
    }
}

async function findPasswordResetSession(email: string) {
    try {
        return await db.otpSession.findFirst({
            where: {
                purpose: "password_reset",
                email,
                consumed_at: null,
            },
            orderBy: { updated_at: "desc" },
        });
    } catch (error) {
        console.error("[OTP] Failed to query password reset OTP session.", error);
        return null;
    }
}

export async function startSignupOtpSession(input: {
    name: string;
    email: string;
    phone: string;
    role: string;
    passwordHash: string;
}) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ sessionId: string; sentVia: string }>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    if (!isValidEmail(email)) {
        return fail<{ sessionId: string; sentVia: string }>("Please enter a valid email address.", 400);
    }

    if (!isValidPhone(phone)) {
        return fail<{ sessionId: string; sentVia: string }>("Please enter a valid phone number in international format.", 400);
    }

    if (input.role !== "candidate" && input.role !== "employer") {
        return fail<{ sessionId: string; sentVia: string }>("Invalid role selected.", 400);
    }

    try {
        const [userByEmail, userByPhone] = await Promise.all([
            db.user.findUnique({ where: { email }, select: { id: true } }),
            db.user.findFirst({ where: { phone }, select: { id: true } }),
        ]);

        if (userByEmail) {
            return fail<{ sessionId: string; sentVia: string }>("Account already exists, please sign in", 409);
        }

        if (userByPhone) {
            return fail<{ sessionId: string; sentVia: string }>(
                "Account already exists with this phone number, please sign in",
                409
            );
        }
    } catch (error) {
        console.error("[OTP] Failed to check duplicate signup account.", error);
        return fail<{ sessionId: string; sentVia: string }>("Unable to validate the signup request right now.", 503);
    }

    const rateLimit = await enforceRateLimit({
        purpose: "signup",
        email,
        phone,
    });

    if (!rateLimit.success) {
        return rateLimit;
    }

    const sessionResult = await storeFreshSession({
        purpose: "signup",
        email,
        phone,
        metadata: {
            name: input.name.trim(),
            email,
            phone,
            passwordHash: input.passwordHash,
            role: input.role,
        },
    });

    if (!sessionResult.success) {
        return sessionResult;
    }

    console.log("[OTP] Signup verification session created.", {
        email,
        phone,
        sessionId: sessionResult.data.session.id,
    });
    console.log("[OTP] Signup OTP generated.", {
        email,
        purpose: "signup",
    });

    const delivery = await deliverOtpCode({
        purpose: "signup",
        otp: sessionResult.data.otp,
        email,
        phone,
        method: canUsePhoneOtp(phone) ? "both" : "email",
    });

    if (!delivery.success) {
        await db.otpSession.deleteMany({ where: { id: sessionResult.data.session.id } }).catch(() => {});
        return delivery;
    }

    return ok({
        sessionId: sessionResult.data.session.id,
        sentVia: delivery.data.sentVia,
    });
}

export async function resendPendingSignupOtp(sessionId: string, method: OtpSendMethod = "both") {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ sentVia: string; hasPhone: boolean }>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    const refreshed = await refreshExistingSession({
        sessionId,
        purpose: "signup",
    });

    if (!refreshed.success) {
        return refreshed;
    }

    const delivery = await deliverOtpCode({
        purpose: "signup",
        otp: refreshed.data.otp,
        email: refreshed.data.session?.email ?? null,
        phone: refreshed.data.session?.phone ?? null,
        method,
    });

    if (!delivery.success) {
        return delivery;
    }

    return ok({
        sentVia: delivery.data.sentVia,
        hasPhone: canUsePhoneOtp(refreshed.data.session?.phone ?? null),
    });
}

export async function confirmPendingSignupOtp(sessionId: string, otp: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ token: string; user: { id: string; name: string; role: string } }>(
            "Unable to connect to the OTP storage service.",
            503
        );
    }

    await cleanupExpiredOtpSessions();

    try {
        const session = await db.otpSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.purpose !== "signup" || session.consumed_at) {
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("Invalid or expired OTP session.", 400);
        }

        if (session.expires_at < new Date()) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("OTP expired. Please request a new code.", 400);
        }

        if (session.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("Too many invalid OTP attempts. Please start again.", 429);
        }

        if (hashOtp(otp) !== session.otp_hash) {
            await markInvalidAttempt(session.id, session.verify_attempts);
            console.log("[OTP] Pending signup OTP verification failed.", { sessionId });
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("Invalid OTP", 400);
        }

        const metadata = parsePendingSignupMetadata(session.metadata);

        if (!metadata) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("Invalid signup session data. Please sign up again.", 400);
        }

        const duplicateUser = await db.user.findFirst({
            where: {
                OR: [
                    { email: metadata.email },
                    metadata.phone ? { phone: metadata.phone } : undefined,
                ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
            },
        });

        if (duplicateUser) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<{ token: string; user: { id: string; name: string; role: string } }>("Account already exists, please sign in", 409);
        }

        const user = await db.user.create({
            data: {
                name: metadata.name,
                email: metadata.email,
                phone: metadata.phone,
                password_hash: metadata.passwordHash,
                role: metadata.role,
                is_verified: true,
                verification_otp: null,
                otp_expiry: null,
            },
        });

        await db.otpSession.delete({ where: { id: session.id } });

        console.log("[OTP] Pending signup OTP verified successfully.", {
            sessionId,
            userId: user.id,
            email: user.email,
        });

        return ok({
            user: { id: user.id, name: user.name, role: user.role },
        });
    } catch (error) {
        console.error("[OTP] Failed to confirm signup OTP.", error);
        return fail<{ token: string; user: { id: string; name: string; role: string } }>("Unable to verify the OTP right now.", 503);
    }
}

export async function createUserVerificationOtp(userId: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ sentVia: string; hasPhone: boolean }>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, phone: true, is_verified: true },
        });

        if (!user || !user.email) {
            return fail<{ sentVia: string; hasPhone: boolean }>("Account not found for verification.", 404);
        }

        const hasPhone = canUsePhoneOtp(user.phone);

        if (user.is_verified) {
            return ok({ sentVia: hasPhone ? "both" : "email", hasPhone });
        }

        const rateLimit = await enforceRateLimit({
            purpose: "account_verification",
            email: user.email,
            phone: user.phone,
            userId: user.id,
        });

        if (!rateLimit.success) {
            return rateLimit;
        }

        const sessionResult = await storeFreshSession({
            purpose: "account_verification",
            userId: user.id,
            email: user.email,
            phone: user.phone,
        });

        if (!sessionResult.success) {
            return sessionResult;
        }

        const delivery = await deliverOtpCode({
            purpose: "account_verification",
            otp: sessionResult.data.otp,
            email: user.email,
            phone: user.phone,
            method: hasPhone ? "both" : "email",
        });

        if (!delivery.success) {
            await db.otpSession.deleteMany({ where: { id: sessionResult.data.session.id } }).catch(() => {});
            return delivery;
        }

        return ok({
            sentVia: delivery.data.sentVia,
            hasPhone,
        });
    } catch (error) {
        console.error("[OTP] Failed to create account verification OTP.", error);
        return fail<{ sentVia: string; hasPhone: boolean }>("Unable to send the verification OTP right now.", 503);
    }
}

export async function resendUserVerificationOtp(userId: string, method: OtpSendMethod = "email") {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ sentVia: string; hasPhone: boolean }>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    try {
        const session = await db.otpSession.findFirst({
            where: {
                purpose: "account_verification",
                user_id: userId,
                consumed_at: null,
            },
            orderBy: { updated_at: "desc" },
        });

        if (!session) {
            return createUserVerificationOtp(userId);
        }

        const refreshed = await refreshExistingSession({
            sessionId: session.id,
            purpose: "account_verification",
        });

        if (!refreshed.success) {
            return refreshed;
        }

        const delivery = await deliverOtpCode({
            purpose: "account_verification",
            otp: refreshed.data.otp,
            email: refreshed.data.session?.email ?? null,
            phone: refreshed.data.session?.phone ?? null,
            method,
        });

        if (!delivery.success) {
            return delivery;
        }

        return ok({
            sentVia: delivery.data.sentVia,
            hasPhone: canUsePhoneOtp(refreshed.data.session?.phone ?? null),
        });
    } catch (error) {
        console.error("[OTP] Failed to resend account verification OTP.", error);
        return fail<{ sentVia: string; hasPhone: boolean }>("Unable to resend the verification OTP right now.", 503);
    }
}

export async function verifyUserOtp(userId: string, otp: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<boolean>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    try {
        const session = await db.otpSession.findFirst({
            where: {
                purpose: "account_verification",
                user_id: userId,
                consumed_at: null,
            },
            orderBy: { updated_at: "desc" },
        });

        if (!session) {
            return fail<boolean>("OTP session not found. Please request a new code.", 400);
        }

        if (session.expires_at < new Date()) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<boolean>("OTP expired. Please request a new code.", 400);
        }

        if (session.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<boolean>("Too many invalid OTP attempts. Please request a new code.", 429);
        }

        if (hashOtp(otp) !== session.otp_hash) {
            await markInvalidAttempt(session.id, session.verify_attempts);
            console.log("[OTP] Account verification OTP failed.", { userId });
            return fail<boolean>("Invalid OTP", 400);
        }

        await Promise.all([
            db.user.update({
                where: { id: userId },
                data: {
                    is_verified: true,
                    verification_otp: null,
                    otp_expiry: null,
                },
            }),
            db.otpSession.delete({ where: { id: session.id } }),
        ]);

        console.log("[OTP] Account verification OTP verified successfully.", { userId });
        return ok(true);
    } catch (error) {
        console.error("[OTP] Failed to verify account OTP.", error);
        return fail<boolean>("Unable to verify the OTP right now.", 503);
    }
}

export async function requestPasswordResetOtp(rawEmail: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ message: string }>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
        return fail<{ message: string }>("Please enter a valid email address.", 400);
    }

    try {
        const user = await db.user.findUnique({
            where: { email },
            select: { id: true, email: true, phone: true },
        });

        if (!user) {
            console.log("[OTP] Password reset requested for a non-existent email.", { email });
            return ok({
                message: "If an account with that email exists, a reset code has been sent.",
            });
        }

        const rateLimit = await enforceRateLimit({
            purpose: "password_reset",
            email: user.email,
            phone: user.phone,
            userId: user.id,
        });

        if (!rateLimit.success) {
            return rateLimit;
        }

        const existingSession = await findPasswordResetSession(user.email);
        const sessionResult = existingSession
            ? await refreshExistingSession({
                sessionId: existingSession.id,
                purpose: "password_reset",
            })
            : await storeFreshSession({
                purpose: "password_reset",
                userId: user.id,
                email: user.email,
                phone: user.phone,
            });

        if (!sessionResult.success) {
            return sessionResult;
        }

        const delivery = await deliverOtpCode({
            purpose: "password_reset",
            otp: sessionResult.data.otp,
            email: user.email,
            phone: user.phone,
            method: canUsePhoneOtp(user.phone) ? "both" : "email",
        });

        if (!delivery.success) {
            return delivery;
        }

        return ok({
            message: "If an account with that email exists, a reset code has been sent.",
        });
    } catch (error) {
        console.error("[OTP] Failed to request password reset OTP.", error);
        return fail<{ message: string }>("Unable to send the reset OTP right now.", 503);
    }
}

export async function resetPasswordWithOtp(rawEmail: string, otp: string, newPassword: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<boolean>("Unable to connect to the OTP storage service.", 503);
    }

    await cleanupExpiredOtpSessions();

    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
        return fail<boolean>("Please enter a valid email address.", 400);
    }

    if (newPassword.length < 6) {
        return fail<boolean>("Password must be at least 6 characters.", 400);
    }

    try {
        const user = await db.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!user) {
            return fail<boolean>("Invalid request", 400);
        }

        const session = await db.otpSession.findFirst({
            where: {
                purpose: "password_reset",
                email,
                user_id: user.id,
                consumed_at: null,
            },
            orderBy: { updated_at: "desc" },
        });

        if (!session) {
            return fail<boolean>("Invalid or expired reset code", 400);
        }

        if (session.expires_at < new Date()) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<boolean>("Invalid or expired reset code", 400);
        }

        if (session.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
            await db.otpSession.delete({ where: { id: session.id } }).catch(() => {});
            return fail<boolean>("Too many invalid reset attempts. Please request a new code.", 429);
        }

        if (hashOtp(otp) !== session.otp_hash) {
            await markInvalidAttempt(session.id, session.verify_attempts);
            console.log("[OTP] Password reset OTP verification failed.", { email });
            return fail<boolean>("Invalid or expired reset code", 400);
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await Promise.all([
            db.user.update({
                where: { id: user.id },
                data: {
                    password_hash: passwordHash,
                    verification_otp: null,
                    otp_expiry: null,
                },
            }),
            db.otpSession.delete({ where: { id: session.id } }),
        ]);

        console.log("[OTP] Password reset OTP verified successfully.", { email });
        return ok(true);
    } catch (error) {
        console.error("[OTP] Failed to reset password with OTP.", error);
        return fail<boolean>("Unable to reset the password right now.", 503);
    }
}

export async function getPendingSignupDetails(sessionId: string) {
    if (!(await ensureOtpInfrastructure())) {
        return fail<{ hasPhone: boolean }>("Unable to connect to the OTP storage service.", 503);
    }

    try {
        const session = await db.otpSession.findUnique({
            where: { id: sessionId },
            select: { phone: true, purpose: true, consumed_at: true, expires_at: true },
        });

        if (!session || session.purpose !== "signup" || session.consumed_at || session.expires_at < new Date()) {
            return fail<{ hasPhone: boolean }>("OTP session not found.", 404);
        }

        return ok({ hasPhone: canUsePhoneOtp(session.phone) });
    } catch (error) {
        console.error("[OTP] Failed to read pending signup session.", error);
        return fail<{ hasPhone: boolean }>("Unable to read OTP session details right now.", 503);
    }
}
