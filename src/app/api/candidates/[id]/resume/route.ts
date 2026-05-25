import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendResumeDownloadEmail } from "@/lib/email";
import { sendWhatsAppResumeDownload } from "@/lib/whatsapp";
import { isStoredResumeUrl, readStoredResumeFileByUrl } from "@/lib/resume-storage";
import { getEmployerCandidateAccess } from "@/lib/employer-subscriptions";

const MIME_TYPE_EXTENSION_MAP: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function sanitizeFileNameBase(name: string) {
    const safeBase = name
        .replace(/[^a-z0-9_-]/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return safeBase || "resume";
}

function getDownloadFileName(candidateName: string | null, resumeUrl: string, contentType: string) {
    const parsedUrl = resumeUrl.startsWith("http")
        ? new URL(resumeUrl)
        : new URL(resumeUrl, "http://localhost");
    const pathName = parsedUrl.pathname;
    const extensionFromPath = pathName.includes(".")
        ? pathName.slice(pathName.lastIndexOf("."))
        : "";
    const extension = extensionFromPath || MIME_TYPE_EXTENSION_MAP[contentType] || ".bin";

    return `${sanitizeFileNameBase(candidateName || "candidate_resume")}${extension}`;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Fetch candidate details
        const candidate = await db.user.findUnique({
            where: { id, role: "candidate" },
            select: { id: true, name: true, email: true, phone: true, resume_url: true }
        });


        if (!candidate || !candidate.resume_url) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        if (session.role === "employer" && session.userId !== candidate.id) {
            const candidateAccess = await getEmployerCandidateAccess(session.userId, candidate.id);
            if (!candidateAccess.canAccessContact) {
                return NextResponse.json({
                    error: "Your current employer plan does not include direct resume access for this candidate.",
                }, { status: 403 });
            }
        }

        const requestUrl = new URL(req.url);
        const wantsDownload = requestUrl.searchParams.get("download") === "1";

        // Only track and alert if an employer is downloading (not the candidate themselves)
        if (session.role === "employer" && session.userId !== candidate.id) {
            const employer = await db.user.findUnique({
                where: { id: session.userId },
                select: { name: true }
            });

            const employerName = employer?.name || "An employer";
            const candidateName = candidate.name || "Candidate";

            // Async alerts
            if (candidate.email) {
                sendResumeDownloadEmail(candidate.email, candidateName, employerName)
                    .catch(err => console.error("Resume download email failed:", err));
            }
            if (candidate.phone) {
                sendWhatsAppResumeDownload(candidate.phone, candidateName, employerName)
                    .catch(err => console.error("Resume download WhatsApp failed:", err));
            }
        }

        if (wantsDownload) {
            if (isStoredResumeUrl(candidate.resume_url)) {
                const resume = await readStoredResumeFileByUrl(candidate.resume_url);

                if (!resume) {
                    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
                }

                return new NextResponse(resume.buffer, {
                    headers: {
                        "Content-Type": resume.mimeType,
                        "Content-Disposition": `attachment; filename="${resume.fileName}"`,
                        "Cache-Control": "private, no-store",
                    },
                });
            }

            const upstreamResume = await fetch(new URL(candidate.resume_url, req.url));
            if (!upstreamResume.ok) {
                return NextResponse.json({ error: "Failed to download resume" }, { status: 502 });
            }

            const contentType = upstreamResume.headers.get("content-type") || "application/octet-stream";
            const upstreamDisposition = upstreamResume.headers.get("content-disposition");
            const downloadFileName = upstreamDisposition?.includes("filename=")
                ? upstreamDisposition.split("filename=")[1]?.replace(/["']/g, "").trim()
                : getDownloadFileName(candidate.name, candidate.resume_url, contentType);
            const buffer = Buffer.from(await upstreamResume.arrayBuffer());

            return new NextResponse(buffer, {
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": `attachment; filename="${downloadFileName}"`,
                    "Cache-Control": "private, no-store",
                },
            });
        }

        // Redirect to the actual resume URL
        return NextResponse.redirect(new URL(candidate.resume_url, req.url));

    } catch (error) {
        console.error("Resume Download API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
