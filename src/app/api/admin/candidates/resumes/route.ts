import { NextResponse } from "next/server";
import path from "path";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { buildZipArchive } from "@/lib/zip";
import { isStoredResumeUrl, readStoredResumeFileByUrl } from "@/lib/resume-storage";

const NO_RESUME_VALUE = "No resume provided";

const MIME_TYPE_EXTENSION_MAP: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function sanitizeFileNamePart(value: string) {
    return value
        .replace(/[^a-z0-9_-]/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "resume";
}

function getResumeExtension(fileName: string, mimeType: string) {
    const parsedExtension = path.extname(fileName);
    if (parsedExtension) {
        return parsedExtension;
    }

    return MIME_TYPE_EXTENSION_MAP[mimeType] || ".bin";
}

function getDownloadFileName(candidateName: string | null, sourceName: string, mimeType: string) {
    const baseName = sanitizeFileNamePart(candidateName || "candidate");
    const originalBaseName = sanitizeFileNamePart(path.parse(sourceName).name);
    const extension = getResumeExtension(sourceName, mimeType);

    return `${baseName}_${originalBaseName}${extension}`;
}

function getUniqueFileName(fileName: string, usedFileNames: Set<string>) {
    if (!usedFileNames.has(fileName)) {
        usedFileNames.add(fileName);
        return fileName;
    }

    const parsed = path.parse(fileName);
    let counter = 2;
    let nextFileName = `${parsed.name}_${counter}${parsed.ext}`;

    while (usedFileNames.has(nextFileName)) {
        counter += 1;
        nextFileName = `${parsed.name}_${counter}${parsed.ext}`;
    }

    usedFileNames.add(nextFileName);
    return nextFileName;
}

async function getAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) return null;

    const session = await verifyAuth(token.value);
    if (!session) return null;

    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, is_admin: true },
    });

    if (!user?.is_admin) return null;
    return user;
}

export async function GET(req: Request) {
    try {
        const admin = await getAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const candidates = await db.user.findMany({
            where: {
                role: "candidate",
                resume_url: {
                    not: null,
                },
            },
            select: {
                id: true,
                name: true,
                resume_url: true,
                created_at: true,
            },
            orderBy: { created_at: "desc" },
        });

        const zipEntries: Array<{ fileName: string; data: Buffer; modifiedAt?: Date }> = [];
        const usedFileNames = new Set<string>();

        for (const candidate of candidates) {
            if (!candidate.resume_url || candidate.resume_url === NO_RESUME_VALUE) {
                continue;
            }

            try {
                if (isStoredResumeUrl(candidate.resume_url)) {
                    const storedResume = await readStoredResumeFileByUrl(candidate.resume_url);
                    if (!storedResume) {
                        continue;
                    }

                    const fileName = getUniqueFileName(
                        getDownloadFileName(candidate.name, storedResume.fileName, storedResume.mimeType),
                        usedFileNames
                    );

                    zipEntries.push({
                        fileName,
                        data: storedResume.buffer,
                        modifiedAt: candidate.created_at,
                    });
                    continue;
                }

                const response = await fetch(new URL(candidate.resume_url, req.url));
                if (!response.ok) {
                    console.error(`Bulk resume download skipped for candidate ${candidate.id}: upstream download failed.`);
                    continue;
                }

                const contentType = response.headers.get("content-type") || "application/octet-stream";
                const disposition = response.headers.get("content-disposition");
                const dispositionNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
                const upstreamFileName = dispositionNameMatch?.[1]
                    || path.basename(new URL(candidate.resume_url, req.url).pathname)
                    || "resume";
                const fileName = getUniqueFileName(
                    getDownloadFileName(candidate.name, upstreamFileName, contentType),
                    usedFileNames
                );

                zipEntries.push({
                    fileName,
                    data: Buffer.from(await response.arrayBuffer()),
                    modifiedAt: candidate.created_at,
                });
            } catch (error) {
                console.error(`Bulk resume download skipped for candidate ${candidate.id}.`, error);
            }
        }

        if (zipEntries.length === 0) {
            return NextResponse.json({ error: "No uploaded resumes are available to download." }, { status: 404 });
        }

        const zipBuffer = buildZipArchive(zipEntries);
        const now = new Date().toISOString().slice(0, 10);

        return new NextResponse(zipBuffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="candidate_resumes_${now}.zip"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("Bulk candidate resume download error:", error);
        return NextResponse.json({ error: "Failed to generate resume ZIP download." }, { status: 500 });
    }
}
