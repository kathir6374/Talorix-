"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function CandidateBottomNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab") || "overview";

    // Show globally if we render it, but highlight the correct tab
    const isJobsPage = pathname?.startsWith("/jobs") || tab === "jobs";

    return (
        <nav className="mobile-tab-bar z-50">
            <Link href="/candidate-dashboard?tab=overview" className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-center transition-colors min-h-[56px] ${!isJobsPage && tab === "overview" ? 'text-[#FF7A00]' : 'text-muted-foreground hover:text-[#FF7A00]'}`}>
                <span className="flex h-5 w-5 items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-center">Home</span>
            </Link>

            <Link href="/candidate-dashboard?tab=jobs" className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-center transition-colors min-h-[56px] ${isJobsPage ? 'text-[#FF7A00]' : 'text-muted-foreground hover:text-[#FF7A00]'}`}>
                <span className="flex h-5 w-5 items-center justify-center shrink-0">
                    <svg className="w-5 h-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-center">Jobs</span>
            </Link>

            <Link href="/candidate-dashboard?tab=saved" className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-center transition-colors min-h-[56px] ${!isJobsPage && tab === "saved" ? 'text-[#FF7A00]' : 'text-muted-foreground hover:text-[#FF7A00]'}`}>
                <span className="flex h-5 w-5 items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-center">Saved</span>
            </Link>

            <Link href="/candidate-dashboard?tab=applications" className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-center transition-colors min-h-[56px] ${!isJobsPage && tab === "applications" ? 'text-[#FF7A00]' : 'text-muted-foreground hover:text-[#FF7A00]'}`}>
                <span className="flex h-5 w-5 items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-center">Applied</span>
            </Link>

            <Link href="/candidate-dashboard?tab=profile" className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-center transition-colors min-h-[56px] ${!isJobsPage && tab === "profile" ? 'text-[#FF7A00]' : 'text-muted-foreground hover:text-[#FF7A00]'}`}>
                <span className="flex h-5 w-5 items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-center">Profile</span>
            </Link>

        </nav>
    );
}
