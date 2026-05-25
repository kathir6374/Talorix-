import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: post_id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        let currentUserId: string | null = null;

        if (token) {
            const session = await verifyAuth(token.value);
            if (session) currentUserId = session.userId;
        }

        const comments = await db.comment.findMany({
            where: { post_id, parent_id: null },
            include: {
                author: {
                    select: {
                        name: true,
                        avatar_url: true,
                        role: true,
                    }
                },
                replies: {
                    include: {
                        author: {
                            select: {
                                name: true,
                                avatar_url: true,
                                role: true,
                            }
                        },
                        votes: currentUserId ? {
                            where: { user_id: currentUserId },
                            select: { id: true }
                        } : false,
                    },
                    orderBy: { created_at: "asc" }
                },
                votes: currentUserId ? {
                    where: { user_id: currentUserId },
                    select: { id: true }
                } : false,
            },
            orderBy: { created_at: "asc" }
        });

        const formatted = comments.map((c: any) => ({
            ...c,
            userVotedHelpful: c.votes && c.votes.length > 0,
            votes: undefined,
            replies: c.replies?.map((r: any) => ({
                ...r,
                userVotedHelpful: r.votes && r.votes.length > 0,
                votes: undefined,
            })) || [],
        }));

        return NextResponse.json({ comments: formatted });
    } catch (error) {
        console.error("Fetch Comments Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: post_id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content, parent_id } = await req.json();
        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const comment = await db.comment.create({
            data: {
                post_id,
                author_id: session.userId,
                content,
                parent_id: parent_id || null,
            },
            include: {
                author: {
                    select: {
                        name: true,
                        avatar_url: true,
                        role: true,
                    }
                }
            }
        });

        return NextResponse.json({ comment });
    } catch (error) {
        console.error("Create Comment Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
