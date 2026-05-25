import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { uploadMediaToDrive } from "@/lib/google-drive";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file type
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            return NextResponse.json({ error: "Only images and videos are allowed" }, { status: 400 });
        }

        // Validate file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const safeName = `${session.userId}_${timestamp}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

        const uploadResult = await uploadMediaToDrive(
            buffer,
            safeName,
            file.type
        );

        return NextResponse.json({
            success: true,
            url: uploadResult.directLink,
            fileId: uploadResult.fileId,
            type: isImage ? "image" : "video"
        });
    } catch (error: any) {
        console.error("Media upload error:", error);
        const errorMessage = error.message || "Unknown error";
        return NextResponse.json({
            error: "Upload failed: " + errorMessage,
            details: error.response?.data || null
        }, { status: 500 });
    }
}
