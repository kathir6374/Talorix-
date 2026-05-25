"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dashboardMenuExpanded, setDashboardMenuExpanded] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const currentTheme = theme === "system" ? systemTheme : theme;
        setTheme(currentTheme === "dark" ? "light" : "dark");
    };

    useEffect(() => {
        // A simple check on the client-side to dynamically update the UI
        const cookies = document.cookie.split(";");
        
        // Fix: Check for exact value to avoid matching empty cookies
        const isLoggedIn = cookies.some((c) => c.trim() === "is_logged_in=1");
        setIsAuthenticated(isLoggedIn);

        const roleCookie = cookies.find((c) => c.trim().startsWith("user_role="));
        if (roleCookie) {
            setUserRole(roleCookie.split("=")[1]);
        } else {
            setUserRole(null);
        }

        // Auto-expand dashboard menu if we are already on a dashboard page
        if (pathname?.includes("-dashboard")) {
            setDashboardMenuExpanded(true);
        }
    }, [pathname]);

    const employerTab = searchParams.get("tab");
    const candidateTab = searchParams.get("tab");
    const isEmployerTalentPage =
        pathname?.startsWith("/employer-dashboard/candidates") ||
        pathname?.startsWith("/employer-dashboard/top-candidates") ||
        (pathname === "/employer-dashboard" && employerTab === "talent");
    const isEmployerDashboardPage =
        pathname === "/employer-dashboard" && employerTab !== "talent";
    const isCandidateJobsPage =
        pathname?.startsWith("/jobs") ||
        (pathname === "/candidate-dashboard" && candidateTab === "jobs");
    const isCandidateDashboardPage =
        pathname === "/candidate-dashboard" && candidateTab !== "jobs";
    const jobsHref = userRole === "candidate" ? "/candidate-dashboard?tab=jobs" : "/jobs";

    const handleLogout = async () => {
        try {
            // First clear client-accessible cookies for immediate UI feedback
            document.cookie = "is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            
            setIsAuthenticated(false);
            setUserRole(null);

            // Then notify the server to clear httpOnly cookies
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            // Force a hard reload to the login page to clear all memory state
            window.location.href = "/login";
        }
    };

    return (
        <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-all duration-300">
            <div className="w-full px-4 min-[480px]:px-5 sm:px-6 lg:px-10 max-w-[1400px] mx-auto">
                <div className="flex justify-between h-14 md:h-16 items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="relative block w-[112px] h-[36px] md:w-[128px] md:h-[40px] overflow-hidden transition-transform hover:scale-105 shrink-0">
                            <img
                                src="/brand/talorix-white.png"
                                alt="Talorix Logo"
                                className="hidden dark:block absolute max-w-none w-[151px] md:w-[173px] h-auto -left-[18px] md:-left-[21px] -top-[59px] md:-top-[68px]"
                                decoding="async" loading="lazy" />
                            <img
                                src="/brand/talorix-black.png"
                                alt="Talorix Logo"
                                className="block dark:hidden absolute max-w-none w-[151px] md:w-[173px] h-auto -left-[18px] md:-left-[21px] -top-[59px] md:-top-[68px]"
                                decoding="async" loading="lazy" />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex flex-1 justify-end mr-20 space-x-8">
                        {userRole !== 'employer' && (
                            <>
                                <Link href={jobsHref} className={`px-3 py-2 text-sm font-medium transition-colors duration-300 relative group ${isCandidateJobsPage || (userRole !== "candidate" && pathname?.startsWith('/jobs')) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                    Jobs
                                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#FF7A00] transform origin-left transition-transform duration-300 ${isCandidateJobsPage || (userRole !== "candidate" && pathname?.startsWith('/jobs')) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </Link>
                                <Link href="/companies" className={`px-3 py-2 text-sm font-medium transition-colors duration-300 relative group ${pathname?.startsWith('/companies') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                    Companies
                                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#FF7A00] transform origin-left transition-transform duration-300 ${pathname?.startsWith('/companies') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </Link>
                            </>
                        )}

                        {userRole === 'employer' && (
                            <div className="flex space-x-8">
                                <Link href="/employer-dashboard" className={`px-3 py-2 text-sm font-medium transition-colors duration-300 relative group ${isEmployerDashboardPage ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                    Dashboard
                                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#FF7A00] transform origin-left transition-transform duration-300 ${isEmployerDashboardPage ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </Link>
                                <Link href="/employer-dashboard?tab=talent" className={`px-3 py-2 text-sm font-medium transition-colors duration-300 relative group ${isEmployerTalentPage ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                    Find Talent
                                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#FF7A00] transform origin-left transition-transform duration-300 ${isEmployerTalentPage ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </Link>
                            </div>
                        )}
                        {userRole === 'candidate' && (
                            <Link href="/candidate-dashboard" className={`px-3 py-2 text-sm font-medium transition-colors duration-300 relative group ${isCandidateDashboardPage ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                Dashboard
                                <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#FF7A00] transform origin-left transition-transform duration-300 ${isCandidateDashboardPage ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>
                        )}
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full bg-muted border border-border text-foreground hover:border-[#FF7A00]/50 transition-all"
                            title={mounted ? (theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode") : "Toggle Theme"}
                        >
                            {!mounted ? (
                                <div className="w-5 h-5 bg-transparent" />
                            ) : (theme === "dark" || (theme === "system" && systemTheme === "dark")) ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            )}
                        </button>
                        {!isAuthenticated ? (
                            <>
                                <Link href="/login" className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300">
                                    Log in
                                </Link>
                                <Link href="/signup" className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-foreground transition-all duration-200 bg-[#FF7A00] border border-transparent rounded-full hover:bg-[#FF7A00]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7A00]">
                                    Sign up
                                </Link>
                            </>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300"
                            >
                                Log out
                            </button>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center md:hidden gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-muted border border-border text-foreground min-w-[40px] min-h-[40px] flex items-center justify-center"
                        >
                            {!mounted ? (
                                <div className="w-5 h-5 bg-transparent" />
                            ) : (theme === "dark" || (theme === "system" && systemTheme === "dark")) ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                                </svg>
                            )}
                        </button>
                        {(
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none transition-colors duration-300"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!mobileMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-background/95 backdrop-blur-3xl border-b border-border absolute top-full w-full transition-all">
                    <div className="px-4 pt-2 pb-6 space-y-1 sm:px-3">
                        {userRole !== 'employer' && (
                            <>
                                <Link href={jobsHref} onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-3 rounded-md text-base font-medium ${isCandidateJobsPage || (userRole !== "candidate" && pathname?.startsWith('/jobs')) ? "text-[#FF7A00]" : "text-muted-foreground hover:text-foreground"}`}>
                                    Jobs
                                </Link>
                                <Link href="/companies" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground block px-3 py-3 rounded-md text-base font-medium">
                                    Companies
                                </Link>
                            </>
                        )}

                        {userRole === 'candidate' && (
                            <div className="space-y-1">
                                <button
                                    onClick={() => setDashboardMenuExpanded(!dashboardMenuExpanded)}
                                    className={`w-full text-left flex justify-between items-center px-3 py-3 rounded-md text-base font-medium ${pathname?.includes("/candidate-dashboard") ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    Dashboard
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${dashboardMenuExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {dashboardMenuExpanded && (
                                    <div className="pl-6 space-y-1 mt-1 border-l-2 border-[#FF7A00]/30 ml-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Link href="/candidate-dashboard?tab=overview" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Overview</Link>
                                        <Link href="/candidate-dashboard?tab=jobs" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-sm font-medium ${candidateTab === "jobs" && pathname === "/candidate-dashboard" ? "text-[#FF7A00] font-black uppercase" : "text-muted-foreground hover:text-foreground"}`}>Jobs</Link>
                                        <Link href="/candidate-dashboard?tab=profile" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Edit Profile</Link>
                                        <Link href="/candidate-dashboard?tab=saved" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Saved Jobs</Link>
                                        <Link href="/candidate-dashboard?tab=applications" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Applied Jobs</Link>
                                    </div>
                                )}
                            </div>
                        )}
                        {userRole === 'employer' && (
                            <div className="space-y-1">
                                <button
                                    onClick={() => setDashboardMenuExpanded(!dashboardMenuExpanded)}
                                    className={`w-full text-left flex justify-between items-center px-3 py-3 rounded-md text-base font-medium ${pathname?.includes("/employer-dashboard") ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    Dashboard
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${dashboardMenuExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {dashboardMenuExpanded && (
                                    <div className="pl-6 space-y-1 mt-1 border-l-2 border-[#FF7A00]/30 ml-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Link href="/employer-dashboard?tab=overview" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Overview</Link>
                                        <Link href="/employer-dashboard?tab=talent" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-sm font-medium ${isEmployerTalentPage ? "text-primary font-black uppercase" : "text-muted-foreground hover:text-foreground"}`}>Find Talent</Link>
                                        <Link href="/employer-dashboard?tab=applicants" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Applicants</Link>
                                        <Link href="/employer-dashboard?tab=settings" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">Settings</Link>
                                        <Link href="/employer-dashboard/post-job" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground font-bold opacity-70">Post a Job</Link>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-4 mt-4 border-t border-border flex flex-col space-y-3">
                            {!isAuthenticated ? (
                                <>
                                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground block px-4 py-3 rounded-md text-sm font-medium text-center border border-border">
                                        Log in
                                    </Link>
                                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full text-center bg-[#FF7A00] hover:bg-[#FF7A00]/90 text-foreground px-4 py-3 rounded-md text-sm font-medium transition-colors duration-300 shadow-sm shadow-[color:#FF7A00]/20">
                                        Sign up
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full text-center border border-border hover:border-[#FF7A00]/50 text-muted-foreground hover:text-foreground px-4 py-3 rounded-md text-sm font-medium transition-colors duration-300"
                                >
                                    Log out
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
