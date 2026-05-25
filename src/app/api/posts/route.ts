import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const id = searchParams.get("id");
        const sortBy = searchParams.get("sortBy") || "newest";

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        let userId = null;
        if (token) {
            const session = await verifyAuth(token.value);
            userId = session?.userId;
        }

        const where: any = {};
        if (id) where.id = id;
        if (type && type !== "all") where.post_type = type;

        const posts = await db.post.findMany({
            where,
            include: {
                author: {
                    select: {
                        name: true,
                        avatar_url: true,
                        role: true,
                        company_logo_url: true,
                    }
                },
                _count: {
                    select: { comments: true }
                },
                votes: userId ? {
                    where: { user_id: userId },
                    select: { value: true }
                } : false
            },
            orderBy: [
                { is_pinned: "desc" },
                { created_at: "desc" }
            ],
        });

        // Calculate scores aggregate
        const postsWithScore = await Promise.all(posts.map(async (p) => {
            const votesAggregate = await db.postVote.aggregate({
                where: { post_id: p.id },
                _sum: { value: true }
            });
            return {
                ...p,
                score: votesAggregate._sum.value || 0,
                userVote: (p as any).votes?.[0]?.value || 0,
                votes: undefined
            };
        }));

        const finalPosts = sortBy === "top"
            ? postsWithScore.sort((a, b) => (b.score || 0) - (a.score || 0))
            : postsWithScore;

        return NextResponse.json({ posts: finalPosts });
    } catch (error) {
        console.error("Posts Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Deep verify for admin if needed
        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { id: true, role: true, is_admin: true }
        });

        if (!user) {
            return NextResponse.json({ error: "Forbidden: You must be logged in" }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, image_url, video_url, post_type, is_pinned } = body;

        console.log(`Creating post: ${title} by ${user.id} (${user.role})`);

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        const post = await db.post.create({
            data: {
                title,
                content,
                image_url: image_url || null,
                video_url: video_url || null,
                post_type: post_type || "blog",
                is_pinned: user.is_admin ? !!is_pinned : false,
                author_id: user.id,
                author_role: user.is_admin ? "admin" : user.role,
            }
        });

        console.log(`Post created successfully: ${post.id}`);
        return NextResponse.json({ message: "Post created", post }, { status: 201 });
    } catch (error) {
        console.error("Post Creation Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
