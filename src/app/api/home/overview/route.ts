import { NextResponse } from "next/server";
import { getCachedHomeOverviewData } from "@/lib/home-data";

export async function GET() {
    try {
        return NextResponse.json(await getCachedHomeOverviewData());
    } catch (error) {
        console.error("Home overview data error:", error);
        return NextResponse.json({ error: "Failed to load home overview data." }, { status: 500 });
    }
}
