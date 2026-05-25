import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        // Fetch all verified employers
        const employers = await db.user.findMany({
            where: {
                role: "employer",
                is_suspended: false,
            },
            select: {
                id: true,
                name: true,
                avatar_url: true,
                company_logo_url: true,
                company_industry: true,
                verified_employer: true,
                _count: {
                    select: {
                        postedJobs: {
                            where: {
                                status: "ACTIVE"
                            }
                        }
                    }
                }
            }
        });

        const companies = employers.map(employer => ({
            id: employer.id,
            name: employer.name,
            logo: employer.company_logo_url || employer.avatar_url,
            industry: employer.company_industry,
            isVerified: employer.verified_employer,
            jobCount: employer._count.postedJobs
        }));

        return NextResponse.json({ companies }, { status: 200 });
    } catch (error) {
        console.error("Fetch Companies Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
