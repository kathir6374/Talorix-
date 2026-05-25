import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { deleteAvatarFileByUrl, saveAvatarFile } from "@/lib/avatar-storage";

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
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
        }

        // Validate file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id: session.userId },
            select: { avatar_url: true }
        });

        const buffer = Buffer.from(await file.arrayBuffer());
        const savedAvatar = await saveAvatarFile(buffer, file.name, file.type);

        try {
            await db.user.update({
                where: { id: session.userId },
                data: { avatar_url: savedAvatar.url }
            });
        } catch (error) {
            await deleteAvatarFileByUrl(savedAvatar.url).catch(deleteError => {
                console.error("Avatar cleanup after DB update failure:", deleteError);
            });
            throw error;
        }

        await deleteAvatarFileByUrl(existingUser?.avatar_url).catch(error => {
            console.error("Previous avatar cleanup failed:", error);
        });

        return NextResponse.json({
            success: true,
            url: savedAvatar.url,
            fileId: savedAvatar.fileName
        });
    } catch (error: unknown) {
        console.error("Avatar upload error:", error);
        return NextResponse.json({
            error: "Failed to upload avatar",
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
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const existingUser = await db.user.findUnique({
            where: { id: session.userId },
            select: { avatar_url: true }
        });

        await db.user.update({
            where: { id: session.userId },
            data: { avatar_url: null }
        });

        await deleteAvatarFileByUrl(existingUser?.avatar_url).catch(error => {
            console.error("Avatar file cleanup failed:", error);
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Avatar delete error:", error);
        return NextResponse.json({
            error: "Failed to remove avatar",
            details: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
