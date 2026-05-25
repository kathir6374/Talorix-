import { NextResponse } from "next/server";
import { readStoredLogoFile } from "@/lib/logo-storage";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ fileName: string }> }
) {
    try {
        const { fileName } = await params;
        const logo = await readStoredLogoFile(fileName);

        return new NextResponse(logo.buffer, {
            headers: {
                "Content-Type": logo.mimeType,
                "Content-Disposition": `inline; filename="${logo.fileName}"`,
                "Cache-Control": "private, max-age=31536000, immutable",
            },
        });
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
            return NextResponse.json({ error: "Logo not found" }, { status: 404 });
        }

        console.error("Logo file read error:", error);
        return NextResponse.json({ error: "Failed to load logo" }, { status: 500 });
    }
}
