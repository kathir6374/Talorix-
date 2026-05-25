import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const bookmarks = await db.bookmark.findMany({
            where: {
                user_id: session.userId,
                job: {
                    employer: {
                        is_suspended: false
                    }
                }
            },
            include: { 
                job: {
                    include: {
                        employer: {
                            select: {
                                company_logo_url: true,
                                avatar_url: true,
                            }
                        }
                    }
                }
            },
        });

        return NextResponse.json({ bookmarks });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { jobId } = await req.json();
        if (!jobId) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

        const existing = await db.bookmark.findFirst({
            where: { user_id: session.userId, job_id: jobId },
        });

        if (existing) {
            await db.bookmark.delete({
                where: { id: existing.id }
            });
            return NextResponse.json({ message: "Bookmark removed", bookmarked: false });
        } else {
            await db.bookmark.create({
                data: {
                    user_id: session.userId,
                    job_id: jobId,
                }
            });
            return NextResponse.json({ message: "Bookmark added", bookmarked: true });
        }
    } catch (error) {
        console.error("Bookmark error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
