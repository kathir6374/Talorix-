import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { deleteLogoFileByUrl, saveLogoFile } from "@/lib/logo-storage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") {
            return NextResponse.json({ error: "Unauthorized. Only employers can upload logos." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Only JPG, PNG, WEBP, GIF, and AVIF images are allowed" }, { status: 400 });
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id: session.userId },
            select: { company_logo_url: true },
        });

        const buffer = Buffer.from(await file.arrayBuffer());
        const savedLogo = await saveLogoFile(buffer, file.name, file.type);

        try {
            await db.user.update({
                where: { id: session.userId },
                data: { company_logo_url: savedLogo.url },
            });
        } catch (error) {
            await deleteLogoFileByUrl(savedLogo.url).catch((deleteError) => {
                console.error("Logo cleanup after DB update failure:", deleteError);
            });
            throw error;
        }

        await deleteLogoFileByUrl(existingUser?.company_logo_url).catch((deleteError) => {
            console.error("Previous logo cleanup failed:", deleteError);
        });

        return NextResponse.json({
            success: true,
            url: savedLogo.url,
            fileId: savedLogo.fileName
        });
    } catch (error: unknown) {
        console.error("Logo upload error:", error);
        return NextResponse.json({
            error: "Failed to upload logo",
            details: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
