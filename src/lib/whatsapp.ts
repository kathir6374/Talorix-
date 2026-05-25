// WhatsApp OTP & Notification Utility
// Uses WhatsApp Cloud API (Meta Business Platform) to send templated messages
// Falls back to console logging in development when WHATSAPP_API_TOKEN is not configured

interface WhatsAppMessageOptions {
    to: string; // Phone number in international format e.g. "+919876543210"
    templateName: string;
    parameters: Array<{ type: "text"; text: string }>;
}

async function sendWithWhatsAppAPI(options: WhatsAppMessageOptions): Promise<boolean> {
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiToken || !phoneNumberId) return false;

    try {
        // Format phone number — remove spaces, dashes, and leading +
        const formattedPhone = options.to.replace(/[\s\-\+]/g, "");

        const res = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiToken}`,
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: formattedPhone,
                    type: "template",
                    template: {
                        name: options.templateName,
                        language: { code: "en" },
                        components: [
                            {
                                type: "body",
                                parameters: options.parameters,
                            },
                        ],
                    },
                }),
            }
        );

        if (!res.ok) {
            const error = await res.text();
            console.error(`[WhatsApp] API error for template ${options.templateName}:`, error);
            return false;
        }

        console.log(`[WhatsApp] Template ${options.templateName} sent successfully to`, options.to);
        return true;
    } catch (error) {
        console.error(`[WhatsApp] Failed to send template ${options.templateName}:`, error);
        return false;
    }
}

function devLogWhatsApp(options: WhatsAppMessageOptions) {
    console.log(`\n[WHATSAPP] ═══════════════════════════════════════`);
    console.log(`   TEMPLATE: ${options.templateName}`);
    console.log(`   TO: ${options.to}`);
    console.log(`   PARAMS: ${JSON.stringify(options.parameters.map(p => p.text))}`);
    console.log(`═══════════════════════════════════════════\n`);
}

async function sendWhatsAppTemplate(to: string, templateName: string, params: string[]): Promise<boolean> {
    const options: WhatsAppMessageOptions = {
        to,
        templateName,
        parameters: params.map(text => ({ type: "text", text })),
    };

    const sent = await sendWithWhatsAppAPI(options);
    if (!sent) {
        devLogWhatsApp(options);
    }
    return sent;
}

// ── Auth Notifications ──

export async function sendWhatsAppOTP(phone: string, otp: string) {
    return sendWhatsAppTemplate(phone, "otp_verification", [otp]);
}

// ── Candidate Notifications ──

export async function sendWhatsAppApplicationConfirmation(phone: string, jobTitle: string, companyName: string) {
    return sendWhatsAppTemplate(phone, "application_confirmation", [jobTitle, companyName]);
}

export async function sendWhatsAppStatusUpdate(phone: string, jobTitle: string, status: string) {
    return sendWhatsAppTemplate(phone, "application_status_update", [jobTitle, status]);
}

export async function sendWhatsAppInterviewScheduled(phone: string, jobTitle: string, companyName: string, time: string) {
    return sendWhatsAppTemplate(phone, "interview_scheduled", [jobTitle, companyName, time]);
}

export async function sendWhatsAppInterviewStatusUpdate(phone: string, jobTitle: string, companyName: string, status: string) {
    return sendWhatsAppTemplate(phone, "interview_status_update", [jobTitle, companyName, status]);
}

export async function sendWhatsAppProfileView(phone: string, candidateName: string, employerName: string) {
    return sendWhatsAppTemplate(phone, "profile_view_alert", [candidateName, employerName]);
}

export async function sendWhatsAppResumeDownload(phone: string, candidateName: string, employerName: string) {
    return sendWhatsAppTemplate(phone, "resume_download_alert", [candidateName, employerName]);
}

// ── Employer Notifications ──

export async function sendWhatsAppNewApplicationAlert(phone: string, employer_name: string, candidate_name: string, job_title: string) {
    return sendWhatsAppTemplate(phone, "new_application_alert", [employer_name, candidate_name, job_title]);
}


// Check if WhatsApp is configured
export function isWhatsAppConfigured(): boolean {
    return !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
