import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: jobId } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { status } = body;

        if (!["ACTIVE", "PAUSED", "CLOSED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const job = await db.job.findUnique({ where: { id: jobId } });
        if (!job || job.posted_by !== session.userId) {
            return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
        }

        const updatedJob = await db.job.update({
            where: { id: jobId },
            data: { status },
        });

        return NextResponse.json({ job: updatedJob });
    } catch (error) {
        console.error("Error updating job:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: jobId } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const job = await db.job.findUnique({ where: { id: jobId } });
        if (!job || job.posted_by !== session.userId) {
            return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
        }

        // Delete all associated applications explicitly due to relations
        await db.application.deleteMany({
            where: { job_id: jobId }
        });

        // Delete all associated bookmarks explicitly due to relations
        await db.bookmark.deleteMany({
            where: { job_id: jobId }
        });

        await db.job.delete({
            where: { id: jobId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting job:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
