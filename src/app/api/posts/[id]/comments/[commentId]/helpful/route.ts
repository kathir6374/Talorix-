import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
    try {
        const { commentId } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user already voted
        const existing = await db.commentVote.findUnique({
            where: {
                comment_id_user_id: {
                    comment_id: commentId,
                    user_id: session.userId,
                }
            }
        });

        if (existing) {
            // Remove vote (toggle off)
            await db.commentVote.delete({ where: { id: existing.id } });
            await db.comment.update({
                where: { id: commentId },
                data: { helpful_count: { decrement: 1 } }
            });
            return NextResponse.json({ voted: false });
        } else {
            // Add vote
            await db.commentVote.create({
                data: {
                    comment_id: commentId,
                    user_id: session.userId,
                }
            });
            await db.comment.update({
                where: { id: commentId },
                data: { helpful_count: { increment: 1 } }
            });
            return NextResponse.json({ voted: true });
        }
    } catch (error) {
        console.error("Comment Vote Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
