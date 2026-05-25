import { NextResponse } from "next/server";
import { readStoredResumeFile } from "@/lib/resume-storage";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ fileName: string }> }
) {
    try {
        const { fileName } = await params;
        const resume = await readStoredResumeFile(fileName);

        return new NextResponse(resume.buffer, {
            headers: {
                "Content-Type": resume.mimeType,
                "Content-Disposition": `inline; filename="${resume.fileName}"`,
                "Cache-Control": "private, max-age=31536000, immutable",
            },
        });
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        console.error("Resume file read error:", error);
        return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
    }
}
