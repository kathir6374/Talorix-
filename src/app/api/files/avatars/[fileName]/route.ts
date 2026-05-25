import { NextResponse } from "next/server";
import { readStoredAvatarFile } from "@/lib/avatar-storage";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ fileName: string }> }
) {
    try {
        const { fileName } = await params;
        const avatar = await readStoredAvatarFile(fileName);

        return new NextResponse(avatar.buffer, {
            headers: {
                "Content-Type": avatar.mimeType,
                "Content-Disposition": `inline; filename="${avatar.fileName}"`,
                "Cache-Control": "private, max-age=31536000, immutable",
            },
        });
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
            return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
        }

        console.error("Avatar file read error:", error);
        return NextResponse.json({ error: "Failed to load avatar" }, { status: 500 });
    }
}
