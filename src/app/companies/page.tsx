"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Company {
    id: string;
    name: string;
    logo?: string;
    industry?: string;
    isVerified: boolean;
    jobCount: number;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCompanies() {
            try {
                const res = await fetch("/api/companies");
                const data = await res.json();
                if (data.companies) {
                    setCompanies(data.companies);
                }
            } catch (err) {
                console.error("Error fetching companies:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCompanies();
    }, []);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            {/* Header */}
            <div className="relative pt-24 pb-16 overflow-hidden border-b border-border">
                <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-[#FF7A00]/5 blur-[120px] pointer-events-none z-0 blob-animate"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[400px] h-[400px] bg-[#FF7A00]/5 blur-[100px] pointer-events-none z-0 blob-animate-reverse"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto float-slow">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
                            Top <span className="shimmer-text">Companies</span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Discover {companies.length} companies hiring on Talorix.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <svg className="animate-spin h-10 w-10 text-[#FF7A00] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-muted-foreground font-medium">Loading companies...</p>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="text-center py-32 glass rounded-3xl border border-border">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">No companies yet</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">Companies will appear here once employers start posting jobs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companies.map((company) => (
                            <Link key={company.id} href={`/company/${company.id}`} className="block">
                                <div className="glass border border-border rounded-3xl p-6 group hover:border-[#FF7A00]/30 transition-all hover:shadow-sm h-full">
                                    <div className="flex items-center gap-5 mb-5">
                                        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-xl font-bold text-muted-foreground group-hover:border-[#FF7A00]/50 group-hover:text-[#FF7A00] transition-colors duration-300 overflow-hidden">
                                            {company.logo ? (
                                                <img src={company.logo} alt={company.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                            ) : (
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-4-4v4h2v-4h-2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-foreground group-hover:text-[#FF7A00] transition-colors duration-300">{company.name}</h3>
                                                {company.isVerified && (
                                                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-sm">{company.industry || "Technology"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-5 border-t border-border mt-auto">
                                        <span className="bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20 text-xs px-3 py-1 rounded-full font-semibold">
                                            {company.jobCount} open position{company.jobCount !== 1 ? "s" : ""}
                                        </span>
                                        <span className="text-muted-foreground text-sm font-medium group-hover:text-[#FF7A00] transition-colors">View Jobs →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
