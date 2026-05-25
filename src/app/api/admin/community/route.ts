import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { is_admin: true }
        });

        if (!user || !user.is_admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        const posts = await db.post.findMany({
            where: {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { content: { contains: search, mode: 'insensitive' } },
                    { author: { name: { contains: search, mode: 'insensitive' } } },
                ],
            },
            include: {
                author: {
                    select: {
                        name: true,
                        role: true,
                        email: true,
                    },
                },
                _count: {
                    select: { comments: true }
                }
            },
            orderBy: { created_at: "desc" },
        });

        return NextResponse.json({ communityPosts: posts });
    } catch (error) {
        console.error("Admin Community Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { is_admin: true }
        });

        if (!user || !user.is_admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { postId, action } = await req.json();
        if (!postId || !action) {
            return NextResponse.json({ error: "postId and action are required" }, { status: 400 });
        }

        if (action === "delete") {
            const existingPost = await db.post.findUnique({
                where: { id: postId },
                select: { id: true },
            });
            if (!existingPost) {
                return NextResponse.json({ error: "Post not found" }, { status: 404 });
            }

            await db.post.delete({
                where: { id: postId },
            });
            return NextResponse.json({ message: "Post deleted successfully" });
        }

        if (action === "toggle_pin") {
            const currentPost = await db.post.findUnique({ where: { id: postId } });
            if (!currentPost) {
                return NextResponse.json({ error: "Post not found" }, { status: 404 });
            }

            await db.post.update({
                where: { id: postId },
                data: { is_pinned: !currentPost?.is_pinned }
            });
            return NextResponse.json({ message: "Pin status updated" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Admin Community Action Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
