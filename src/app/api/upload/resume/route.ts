import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { deleteResumeFileByUrl, saveResumeFile } from "@/lib/resume-storage";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "candidate") {
            return NextResponse.json({ error: "Unauthorized. Only candidates can upload resumes here." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file type (PDF, DOC, DOCX)
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only PDF, DOC, and DOCX files are allowed" }, { status: 400 });
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id: session.userId },
            select: { resume_url: true },
        });

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadResult = await saveResumeFile(buffer, file.name, file.type);

        try {
            await db.user.update({
                where: { id: session.userId },
                data: { resume_url: uploadResult.url }
            });
        } catch (dbError) {
            await deleteResumeFileByUrl(uploadResult.url).catch(() => {});
            throw dbError;
        }

        await deleteResumeFileByUrl(existingUser?.resume_url).catch((deleteError) => {
            console.error("Previous resume cleanup error:", deleteError);
        });

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            fileName: uploadResult.fileName
        });
    } catch (error: unknown) {
        console.error("Resume upload error:", error);
        return NextResponse.json({
            error: "Failed to upload resume",
            details: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "candidate") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const existingUser = await db.user.findUnique({
            where: { id: session.userId },
            select: { resume_url: true },
        });

        await db.user.update({
            where: { id: session.userId },
            data: { resume_url: null }
        });

        await deleteResumeFileByUrl(existingUser?.resume_url).catch((deleteError) => {
            console.error("Resume file deletion error:", deleteError);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Resume deletion error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
