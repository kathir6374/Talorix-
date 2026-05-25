import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

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

        const { value } = await req.json(); // 1, -1, or 0 to remove
        const user_id = session.userId;

        if (value === 0) {
            await db.postVote.deleteMany({
                where: { post_id, user_id }
            });
        } else {
            await db.postVote.upsert({
                where: {
                    post_id_user_id: {
                        post_id,
                        user_id
                    }
                },
                update: { value },
                create: { post_id, user_id, value }
            });
        }

        return NextResponse.json({ message: "Vote registered" });
    } catch (error) {
        console.error("Vote Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
