// Email utility for application emails and OTP delivery.

import nodemailer from "nodemailer";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

type EmailProvider = "resend" | "smtp";
type SmtpConfig = {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
};

let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let smtpTransporterKey: string | null = null;
let smtpTransportVerified = false;
let lastEmailError: string | null = null;

function setLastEmailError(message: string | null) {
    lastEmailError = message;
}

export function getLastEmailError() {
    return lastEmailError;
}

function getEnvValue(name: string) {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

function getSmtpPassword(host: string | null) {
    const password = getEnvValue("SMTP_PASS");
    if (!password) {
        return null;
    }

    // Gmail App Passwords are commonly pasted with spaces every 4 chars.
    return host === "smtp.gmail.com" ? password.replace(/\s+/g, "") : password;
}

function getSmtpConfig(): SmtpConfig | null {
    const host = getEnvValue("SMTP_HOST");
    const rawPort = getEnvValue("SMTP_PORT");
    const user = getEnvValue("SMTP_USER");
    const pass = getSmtpPassword(host);
    const from = getEnvValue("EMAIL_FROM");

    if (!host || !rawPort || !user || !pass || !from) {
        logEmailConfigurationIssue();
        return null;
    }

    const port = Number(rawPort);

    if (Number.isNaN(port)) {
        console.error("[Email] SMTP_PORT must be a valid number.", { rawPort });
        return null;
    }

    return {
        host,
        port,
        user,
        pass,
        from,
        secure: false,
    };
}

function createSmtpTransporter(config: SmtpConfig) {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
}

async function getVerifiedSmtpTransporter() {
    const config = getSmtpConfig();
    if (!config) {
        return null;
    }

    const transporterKey = `${config.host}:${config.port}:${config.user}:${config.from}`;

    if (!smtpTransporter || smtpTransporterKey !== transporterKey) {
        smtpTransporter = createSmtpTransporter(config);
        smtpTransporterKey = transporterKey;
        smtpTransportVerified = false;
    }

    if (!smtpTransportVerified) {
        try {
            await smtpTransporter.verify();
            smtpTransportVerified = true;
            setLastEmailError(null);

            console.log("[Email] Gmail SMTP transporter verified.", {
                host: config.host,
                port: config.port,
                user: config.user,
                from: config.from,
            });
        } catch (error) {
            const smtpError = error as Error & {
                code?: string;
                command?: string;
                response?: string;
                responseCode?: number;
            };

            smtpTransporter = null;
            smtpTransporterKey = null;
            smtpTransportVerified = false;

            console.error("[Email] Gmail SMTP verification failed.", {
                message: smtpError.message,
                code: smtpError.code,
                command: smtpError.command,
                response: smtpError.response,
                responseCode: smtpError.responseCode,
                host: config.host,
                port: config.port,
                secure: config.secure,
                user: config.user,
                from: config.from,
                usingAppPassword: config.host === "smtp.gmail.com",
            });

            if (smtpError.code === "EAUTH" || smtpError.responseCode === 535) {
                console.error(
                    "[Email] Gmail authentication failed. Use the Gmail address in SMTP_USER and a valid Gmail App Password in SMTP_PASS."
                );
            }

            setLastEmailError(
                smtpError.response || smtpError.message || "Gmail SMTP verification failed."
            );

            return null;
        }
    }

    return { transporter: smtpTransporter, config };
}

function hasAnySmtpConfig() {
    return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"].some(
        (key) => !!getEnvValue(key)
    );
}

function getConfiguredEmailProvider(): EmailProvider | null {
    if (hasAnySmtpConfig()) {
        return "smtp";
    }

    return null;
}

function logEmailConfigurationIssue() {
    const missingKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"].filter(
        (key) => !getEnvValue(key)
    );

    const message = missingKeys.length > 0
        ? `Gmail SMTP is not fully configured. Missing: ${missingKeys.join(", ")}`
        : "Gmail SMTP is not fully configured.";

    setLastEmailError(message);

    console.error(
        "[Email] Gmail SMTP is not fully configured.",
        missingKeys.length > 0 ? { missingKeys } : undefined
    );
}

async function sendWithResend(options: EmailOptions): Promise<boolean> {
    const apiKey = getEnvValue("RESEND_API_KEY");
    if (!apiKey) {
        setLastEmailError("RESEND_API_KEY is missing.");
        console.error("[Email] RESEND_API_KEY is missing.");
        return false;
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: getEnvValue("EMAIL_FROM") || "Talorix <onboarding@resend.dev>",
                to: options.to,
                subject: options.subject,
                html: options.html,
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            setLastEmailError(error || "Resend API request failed.");
            console.error("[Email] Resend API error:", error);
            return false;
        }

        setLastEmailError(null);
        return true;
    } catch (error) {
        setLastEmailError(error instanceof Error ? error.message : "Unknown email delivery error.");
        console.error("[Email] Failed to send:", error);
        return false;
    }
}

async function sendWithSmtp(options: EmailOptions): Promise<boolean> {
    const result = await getVerifiedSmtpTransporter();
    if (!result) {
        return false;
    }

    try {
        console.log("[Email] Gmail SMTP send attempt.", {
            to: options.to,
            from: result.config.from,
            subject: options.subject,
        });

        const info = await result.transporter.sendMail({
            from: result.config.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        setLastEmailError(null);
        console.log("[Email] Gmail SMTP email sent.", {
            to: options.to,
            messageId: info.messageId,
            response: info.response,
        });

        return true;
    } catch (error) {
        const smtpError = error as Error & {
            code?: string;
            command?: string;
            response?: string;
            responseCode?: number;
        };

        console.error("[Email] Gmail SMTP send failed.", {
            message: smtpError.message,
            code: smtpError.code,
            command: smtpError.command,
            response: smtpError.response,
            responseCode: smtpError.responseCode,
            to: options.to,
            from: result.config.from,
        });
        setLastEmailError(
            smtpError.response || smtpError.message || "Gmail SMTP send failed."
        );
        return false;
    }
}

async function sendThroughConfiguredProvider(options: EmailOptions): Promise<boolean> {
    const provider = getConfiguredEmailProvider();

    if (provider === "resend") {
        return sendWithResend(options);
    }

    if (provider === "smtp") {
        return sendWithSmtp(options);
    }

    logEmailConfigurationIssue();
    return false;
}

function devLog(options: EmailOptions) {
    console.log("\n[EMAIL] =======================================");
    console.log(`   TO: ${options.to}`);
    console.log(`   SUBJECT: ${options.subject}`);
    console.log("   ---------------------------------------");
    console.log(`   ${options.html.replace(/<[^>]*>/g, "").substring(0, 200)}`);
    console.log("===========================================\n");
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    setLastEmailError(null);
    const sent = await sendThroughConfiguredProvider(options);
    if (!sent) {
        devLog(options);
    }
    return sent;
}

// Pre-built email templates

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
    console.log("[Email] OTP email send requested.", { to: email });
    return sendThroughConfiguredProvider({
        to: email,
        subject: "Verify your Talorix account",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Verify your account</h2>
                <p style="color: #555;">Use this code to verify your Talorix account:</p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111;">${otp}</span>
                </div>
                <p style="color: #888; font-size: 13px;">This code expires in 10 minutes.</p>
            </div>
        `,
    });
}

export async function sendVerificationEmail(to: string, otp: string) {
    return sendOTPEmail(to, otp);
}

export async function sendPasswordResetEmail(to: string, resetCode: string) {
    return sendEmail({
        to,
        subject: "Reset your Talorix password",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Password Reset</h2>
                <p style="color: #555;">Use this code to reset your password:</p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111;">${resetCode}</span>
                </div>
                <p style="color: #888; font-size: 13px;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
            </div>
        `,
    });
}

export async function sendApplicationConfirmation(to: string, jobTitle: string, companyName: string) {
    return sendEmail({
        to,
        subject: `Application received — ${jobTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Application Submitted!</h2>
                <p style="color: #555;">Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been received.</p>
                <p style="color: #555; margin-top: 16px;">The employer will review your application and get back to you soon.</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendStatusUpdateEmail(to: string, jobTitle: string, status: string) {
    const statusMessages: Record<string, string> = {
        shortlisted: "Congratulations! You've been shortlisted",
        interview: "Great news! You've been scheduled for an interview",
        hired: "Congratulations! You've been hired",
        rejected: "We regret to inform you that your application was not selected",
    };

    const message = statusMessages[status] || `Your application status has been updated to: ${status}`;

    return sendEmail({
        to,
        subject: `Application Update — ${jobTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Application Update</h2>
                <p style="color: #555;">${message} for the position of <strong>${jobTitle}</strong>.</p>
                <div style="border-left: 4px solid #F59E0B; padding-left: 16px; margin: 24px 0;">
                    <p style="color: #111; font-weight: 600; text-transform: capitalize;">Status: ${status}</p>
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendInterviewScheduledEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledTime: string,
    meetingLink: string,
    interviewType: string
) {
    return sendEmail({
        to,
        subject: `Interview Scheduled — ${jobTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Interview Scheduled</h2>
                <p style="color: #555;">Hi ${candidateName},</p>
                <p style="color: #555;">Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="color: #111; font-weight: 600; margin: 0 0 8px 0;">Scheduled for: ${scheduledTime}</p>
                    <p style="color: #555; margin: 0 0 8px 0;">Type: <strong>${interviewType}</strong></p>
                    ${meetingLink ? `<p style="margin: 0;"><a href="${meetingLink}" style="color: #F59E0B; font-weight: 600; text-decoration: none;">Join Meeting →</a></p>` : ""}
                </div>
                <p style="color: #555;">Please be available on time. Good luck!</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendInterviewStatusUpdateEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    status: string
) {
    const isCancelled = status.toLowerCase() === "cancelled";
    const subject = isCancelled ? `Interview Cancelled — ${jobTitle}` : `Interview Completed — ${jobTitle}`;
    const message = isCancelled
        ? `Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.`
        : `Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been marked as completed.`;

    return sendEmail({
        to,
        subject,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Interview Update</h2>
                <p style="color: #555;">Hi ${candidateName},</p>
                <p style="color: #555;">${message}</p>
                <div style="border-left: 4px solid ${isCancelled ? "#EF4444" : "#10B981"}; padding-left: 16px; margin: 24px 0;">
                    <p style="color: #111; font-weight: 600; text-transform: capitalize;">Status: ${status}</p>
                </div>
                <p style="color: #111; margin-top: 16px;">Log in to your dashboard to see next steps.</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendNewApplicationAlertEmail(
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string
) {
    return sendEmail({
        to,
        subject: `New Application — ${jobTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">New Application Received</h2>
                <p style="color: #555;">Hi ${employerName},</p>
                <p style="color: #555;"><strong>${candidateName}</strong> has applied for your <strong>${jobTitle}</strong> posting.</p>
                <div style="border-left: 4px solid #F59E0B; padding-left: 16px; margin: 24px 0;">
                    <p style="color: #111; font-weight: 600;">Review their application and take action from your Employer Dashboard.</p>
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendProfileViewEmail(to: string, candidateName: string, employerName: string) {
    return sendEmail({
        to,
        subject: "Someone viewed your profile!",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Profile View Alert</h2>
                <p style="color: #555;">Hi ${candidateName},</p>
                <p style="color: #555;">An employer from <strong>${employerName}</strong> just viewed your profile on Talorix.</p>
                <p style="color: #555; margin-top: 16px;">Your profile is getting noticed! Keep it updated to attract more opportunities.</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

export async function sendResumeDownloadEmail(to: string, candidateName: string, employerName: string) {
    return sendEmail({
        to,
        subject: "Your resume was downloaded!",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #111; margin-bottom: 8px;">Resume Download Alert</h2>
                <p style="color: #555;">Hi ${candidateName},</p>
                <p style="color: #555;">An employer from <strong>${employerName}</strong> just downloaded your resume.</p>
                <p style="color: #555; margin-top: 16px;">This is a great sign! They might be reaching out soon for an interview.</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">— Team Talorix</p>
            </div>
        `,
    });
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[char] || char));
}

export async function sendJobMatchNotificationEmail(options: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    jobLocation: string;
    jobType: string;
    jobUrl: string;
    matchScore: number;
    matchReason: string;
}) {
    const candidateName = escapeHtml(options.candidateName);
    const jobTitle = escapeHtml(options.jobTitle);
    const companyName = escapeHtml(options.companyName);
    const jobLocation = escapeHtml(options.jobLocation || "Flexible location");
    const jobType = escapeHtml(options.jobType);
    const jobUrl = escapeHtml(options.jobUrl);
    const matchReason = escapeHtml(options.matchReason);
    const subjectJobTitle = options.jobTitle.replace(/[\r\n]+/g, " ").trim();

    return sendEmail({
        to: options.to,
        subject: `New job match - ${subjectJobTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                <p style="color: #888; font-size: 13px; margin: 0 0 12px 0;">Talorix job match</p>
                <h2 style="color: #111; margin: 0 0 12px 0;">A relevant job vacancy was posted</h2>
                <p style="color: #555;">Hi ${candidateName},</p>
                <p style="color: #555;">A new job opening matches your Talorix profile:</p>
                <div style="background: #f7f7f7; border-radius: 14px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #111; margin: 0 0 8px 0;">${jobTitle}</h3>
                    <p style="color: #555; margin: 0 0 6px 0;"><strong>${companyName}</strong></p>
                    <p style="color: #555; margin: 0 0 6px 0;">${jobLocation}</p>
                    <p style="color: #555; margin: 0;">${jobType} - ${options.matchScore}% profile match</p>
                </div>
                <div style="border-left: 4px solid #F59E0B; padding-left: 16px; margin: 24px 0;">
                    <p style="color: #555; margin: 0;">${matchReason}</p>
                </div>
                <p style="margin: 28px 0;">
                    <a href="${jobUrl}" style="display: inline-block; background: #F59E0B; color: #111; font-weight: 700; text-decoration: none; padding: 12px 18px; border-radius: 10px;">View job details</a>
                </p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">You received this because your Talorix profile matched a newly posted job.</p>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">- Team Talorix</p>
            </div>
        `,
    });
}

function formatPlainTextForEmail(value: string) {
    return escapeHtml(value)
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="color: #555; margin: 0 0 16px 0; line-height: 1.7;">${paragraph.replace(/\n/g, "<br />")}</p>`)
        .join("");
}

export async function sendNewsletterBroadcastEmail(to: string, title: string, content: string) {
    const safeTitle = escapeHtml(title.trim());
    const safeSubject = title.replace(/[\r\n]+/g, " ").trim();
    const formattedContent = formatPlainTextForEmail(content.trim());

    return sendEmail({
        to,
        subject: safeSubject,
        html: `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; background: #ffffff;">
                <div style="margin-bottom: 24px;">
                    <p style="color: #F59E0B; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 10px 0;">Talorix Newsletter</p>
                    <h1 style="color: #111; font-size: 30px; line-height: 1.2; margin: 0;">${safeTitle}</h1>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 20px; padding: 24px 24px 8px 24px;">
                    ${formattedContent}
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">You are receiving this email because you subscribed to Talorix updates.</p>
            </div>
        `,
    });
}
