"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CandidateBottomNav } from "@/components/CandidateBottomNav";

interface Job {
    id: string;
    job_title: string;
    company_name: string;
    city: string;
    state: string;
    country: string;
    salary_min: number;
    salary_max: number;
    currency: string;
    job_type: string;
    work_model: string;
    experience_min: number;
    job_description: string;
    created_at: string;
    external_apply_url?: string;
    employer?: {
        avatar_url?: string;
        company_logo_url?: string;
        verified_employer?: boolean;
    };
}

interface RecommendedJob extends Job {
    ai_match_score?: number;
    ai_reason?: string;
}

type DisplayJob = Job & {
    ai_match_score?: number;
    ai_reason?: string;
    isAiRecommended?: boolean;
};

function JobsContent({ embedded = false }: { embedded?: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const searchParamsString = searchParams.toString();
    
    const fixGoogleDriveUrl = (url: string | null | undefined, size = 400) => {
        if (!url) return null;
        if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
            const fileIdMatch = url.match(/[-\w]{25,}/);
            if (fileIdMatch) {
                return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}=s${size}`;
            }
        }
        return url;
    };
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [location, setLocation] = useState(searchParams.get("location") || "");
    const [jobType, setJobType] = useState(searchParams.get("job_type") || "");
    const [workModel, setWorkModel] = useState(searchParams.get("work_model") || "");
    const [experience, setExperience] = useState(searchParams.get("experience") || "");
    const [salaryMin, setSalaryMin] = useState(searchParams.get("salary_min") || "");
    const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    const shouldPinRecommendedJobs =
        userRole === "candidate" &&
        page === 1 &&
        !search &&
        !location &&
        !jobType &&
        !workModel &&
        !experience &&
        !salaryMin &&
        sortBy === "newest";

    const displayJobs: DisplayJob[] = shouldPinRecommendedJobs
        ? [
            ...recommendedJobs.map((job) => ({
                ...job,
                isAiRecommended: true,
            })),
            ...jobs
                .filter((job) => !recommendedJobs.some((recommendedJob) => recommendedJob.id === job.id))
                .map((job) => ({
                    ...job,
                    isAiRecommended: false,
                })),
        ]
        : jobs.map((job) => ({
            ...job,
            isAiRecommended: false,
        }));

    useEffect(() => {
        const cookies = document.cookie.split(";");
        const roleCookie = cookies.find((c) => c.trim().startsWith("user_role="));
        if (roleCookie) {
            setUserRole(roleCookie.split("=")[1]);
        }
    }, []);

    useEffect(() => {
        if (embedded || userRole !== "candidate" || pathname !== "/jobs") return;

        const nextParams = new URLSearchParams(searchParamsString);
        nextParams.set("tab", "jobs");
        router.replace(`/candidate-dashboard?${nextParams.toString()}`, { scroll: false });
    }, [embedded, pathname, router, searchParamsString, userRole]);

    useEffect(() => {
        const nextSearchParams = new URLSearchParams(searchParamsString);
        const nextPage = Number.parseInt(nextSearchParams.get("page") || "1", 10);

        setSearch(nextSearchParams.get("search") || "");
        setLocation(nextSearchParams.get("location") || "");
        setJobType(nextSearchParams.get("job_type") || "");
        setWorkModel(nextSearchParams.get("work_model") || "");
        setExperience(nextSearchParams.get("experience") || "");
        setSalaryMin(nextSearchParams.get("salary_min") || "");
        setSortBy(nextSearchParams.get("sortBy") || "newest");
        setPage(Number.isFinite(nextPage) && nextPage > 0 ? nextPage : 1);
    }, [searchParamsString]);

    useEffect(() => {
        if (userRole !== "candidate") {
            setRecommendedJobs([]);
            setLoadingRecommendations(false);
            return;
        }

        const fetchRecommendedJobs = async () => {
            setLoadingRecommendations(true);
            try {
                const res = await fetch("/api/jobs/recommended?limit=3");
                if (!res.ok) {
                    setRecommendedJobs([]);
                    return;
                }

                const data = await res.json();
                setRecommendedJobs(data.jobs || []);
            } catch (error) {
                console.error("Error fetching AI recommended jobs:", error);
                setRecommendedJobs([]);
            } finally {
                setLoadingRecommendations(false);
            }
        };

        void fetchRecommendedJobs();
    }, [userRole]);

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (search) params.append("search", search);
                if (location) params.append("location", location);
                if (jobType) params.append("job_type", jobType);
                if (workModel) params.append("work_model", workModel);
                if (experience) params.append("experience", experience);
                if (salaryMin) params.append("salary_min", salaryMin);
                if (sortBy) params.append("sortBy", sortBy);
                params.append("page", page.toString());

                const res = await fetch(`/api/jobs?${params.toString()}`);
                const data = await res.json();
                if (data.jobs) {
                    setJobs(data.jobs);
                    setTotal(data.pagination.total);
                    setTotalPages(data.pagination.totalPages);
                }
            } catch (err) {
                console.error("Error fetching jobs:", err);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchJobs, 300);
        return () => clearTimeout(debounceTimer);
    }, [search, location, jobType, workModel, experience, salaryMin, sortBy, page]);

    const clearFilters = () => {
        setSearch("");
        setLocation("");
        setJobType("");
        setWorkModel("");
        setExperience("");
        setSalaryMin("");
        setSortBy("newest");
        setPage(1);
    };

    return (
        <div className={`${embedded ? "bg-transparent" : "min-h-screen bg-background"} w-full min-w-0 transition-colors duration-300 overflow-x-hidden`}>
            {/* Header */}
            <div className={`relative overflow-hidden border-b border-border ${embedded ? "pb-10" : "pt-24 pb-12"}`}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF7A00]/5 blur-[120px] pointer-events-none"></div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight mb-2 uppercase">
                            Career <span className="shimmer-text">Opportunities</span>
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base opacity-70">
                            Browsing {loading ? "..." : total} active positions across the global ecosystem.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between mb-4 glass border border-border rounded-xl p-3">
                    <p className="text-muted-foreground text-xs font-medium">Found <span className="text-foreground font-bold">{total}</span> opportunities</p>
                    <button
                        onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                        className="inline-flex w-full min-[420px]:w-auto items-center justify-center gap-2 bg-[#FF7A00] text-foreground font-bold px-3 py-2 rounded-lg text-xs min-h-[40px]"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        {isMobileFilterOpen ? "Close" : "Filters"}
                    </button>
                </div>

                {/* Prominent Search Bar */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="glass border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2.5 opacity-60">Search Jobs</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Keywords, Job Titles, or Companies..."
                                className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all font-medium placeholder:text-muted-foreground/40"
                            />
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[15.75rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start gap-4 xl:gap-5 min-w-0">
                    {/* Sidebar */}
                    <aside className={`${isMobileFilterOpen ? "block" : "hidden"} lg:block shrink-0 space-y-8 mb-8 lg:mb-0 lg:self-start`}>
                        <div className="glass backdrop-blur-xl border border-border rounded-3xl p-5 sm:p-6 lg:p-5 xl:p-6 sticky top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                            <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between mb-6">
                                <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">Filters</h3>
                                <button onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }} className="self-start min-[420px]:self-auto text-[#FF7A00] text-xs font-bold hover:underline transition-all">Reset All</button>
                            </div>

                            <div className="space-y-5 xl:space-y-6">

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Location</label>
                                    <input type="text" value={location} onChange={(e) => {
                                        setLocation(e.target.value);
                                        setPage(1);
                                    }} placeholder="City, Country..."
                                        className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#FF7A00]/50 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Job Type</label>
                                    <select value={jobType} onChange={(e) => {
                                        setJobType(e.target.value);
                                        setPage(1);
                                    }}
                                        className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#FF7A00]/50 transition-all font-medium appearance-none">
                                        <option value="">All Types</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                        <option value="Freelance">Freelance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Work Model</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Remote', 'Onsite', 'Hybrid'].map(m => (
                                            <button key={m} onClick={() => {
                                                setWorkModel(workModel === m ? "" : m);
                                                setPage(1);
                                            }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${workModel === m ? "bg-[#FF7A00] text-foreground border-transparent" : "bg-muted text-muted-foreground border-border hover:border-[#FF7A00]/30"}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Max Experience ({experience || "0+"} yrs)</label>
                                    <input type="range" min="0" max="20" step="1" value={experience || 0} onChange={(e) => {
                                        setExperience(e.target.value);
                                        setPage(1);
                                    }}
                                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-[#FF7A00]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Min Salary</label>
                                    <input type="number" value={salaryMin} onChange={(e) => {
                                        setSalaryMin(e.target.value);
                                        setPage(1);
                                    }} placeholder="Min Salary (e.g. 50000)"
                                        className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#FF7A00]/50 transition-all font-medium" />
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Results */}
                    <div className="flex-1 min-w-0 space-y-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed">Showing <span className="text-foreground font-bold">{displayJobs.length}</span> of <span className="text-foreground font-bold">{total}</span> results</p>
                            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest shrink-0">Sort:</span>
                                <select value={sortBy} onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setPage(1);
                                }}
                                    className="min-w-0 flex-1 bg-transparent border-none text-right sm:text-left text-foreground text-sm font-bold focus:ring-0 cursor-pointer hover:text-[#FF7A00] transition-colors duration-300">
                                    <option value="newest">Newest</option>
                                    <option value="relevant">Relevant</option>
                                    <option value="highest_salary">Highest Salary</option>
                                </select>
                            </div>
                        </div>

                        {loading || (shouldPinRecommendedJobs && loadingRecommendations) ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="h-64 bg-muted rounded-3xl animate-pulse border border-border"></div>
                                ))}
                            </div>
                        ) : displayJobs.length === 0 ? (
                            <div className="glass border border-border rounded-3xl p-10 sm:p-16 text-center">
                                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-7 h-7 text-muted-foreground opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                </div>
                                <h3 className="text-lg sm:text-2xl font-black text-foreground mb-1.5 uppercase tracking-tight">No Match Found</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm max-w-xs mx-auto mb-6 opacity-70">Try adjusting your filters or search keywords to find better matches.</p>
                                <button onClick={clearFilters} className="bg-[#FF7A00] text-foreground font-extrabold px-6 py-2.5 rounded-xl transition-all shadow-sm shadow-[#FF7A00]/20 text-xs sm:text-sm">Clear All Filters</button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                    {displayJobs.map((job) => (
                                        <Link key={job.id} href={`/jobs/${job.id}`}
                                            className="group glass border border-border rounded-3xl p-4 sm:p-5 xl:p-6 hover:border-[#FF7A00]/30 hover:shadow-sm transition-all flex min-w-0 flex-col relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF7A00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-lg sm:text-xl font-black text-foreground group-hover:border-[#FF7A00]/30 transition-all overflow-hidden shrink-0">
                                                    {job.employer?.company_logo_url ? (
                                                        <img src={fixGoogleDriveUrl(job.employer.company_logo_url)!} alt={job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                    ) : job.employer?.avatar_url ? (
                                                        <img src={fixGoogleDriveUrl(job.employer.avatar_url)!} alt={job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                    ) : (
                                                        job.company_name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col items-end text-right">
                                                    <span className="max-w-full break-words text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{job.job_type}</span>
                                                    <span className="text-foreground font-bold text-sm sm:text-base">{job.currency} {(job.salary_max / 1000).toFixed(0)}k</span>
                                                </div>
                                            </div>

                                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-[#FF7A00] transition-colors duration-300 leading-tight line-clamp-2 break-words">{job.job_title}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mb-4 min-w-0">
                                                <p className="min-w-0 break-words text-gray-400 font-medium text-[12px] sm:text-[13px] uppercase tracking-wide">{job.company_name}</p>
                                                {job.isAiRecommended && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20">AI Recommended</span>
                                                )}
                                                {job.employer?.verified_employer && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20">Verified</span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className="bg-muted px-2 py-1 rounded-full text-[11px] font-bold text-muted-foreground border border-border uppercase tracking-wider">{job.city || "Various"}</span>
                                                <span className="bg-muted px-2 py-1 rounded-full text-[11px] font-bold text-muted-foreground border border-border uppercase tracking-wider">{job.work_model}</span>
                                                <span className="bg-[#FF7A00]/10 px-2 py-1 rounded-full text-[11px] font-bold text-[#FF7A00] border border-[#FF7A00]/20 uppercase tracking-wider">{job.experience_min}+ yrs</span>
                                            </div>

                                            <p className="text-muted-foreground text-[13px] sm:text-[14px] line-clamp-3 mb-4 leading-[1.5] flex-1 break-words">{job.ai_reason || job.job_description}</p>

                                            <div className="mt-auto flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between pt-4 border-t border-border">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(job.created_at).toLocaleDateString()}</span>
                                                <div className="flex flex-wrap items-center gap-2 min-[420px]:justify-end">
                                                    {typeof job.ai_match_score === "number" && (
                                                        <span className="text-[#FF7A00] text-[10px] font-black uppercase tracking-[0.16em]">{job.ai_match_score}% fit</span>
                                                    )}
                                                    <span className="text-[#FF7A00] text-xs font-bold flex items-center group-hover:translate-x-1 transition-transform uppercase tracking-widest">
                                                        Details
                                                        <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex flex-wrap items-center justify-center gap-3 mt-12 py-6 sm:py-8">
                                        <button disabled={page === 1} onClick={() => setPage(page - 1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-all font-bold shrink-0">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                        </button>
                                        <div className="flex min-h-[40px] items-center px-4 sm:px-6 text-center font-black text-foreground uppercase tracking-widest text-xs sm:text-sm bg-muted border border-border rounded-xl">
                                            Page {page} of {totalPages}
                                        </div>
                                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-all font-bold shrink-0">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            {!embedded && userRole === "candidate" && <CandidateBottomNav />}
        </div >
    );
}

export default function CandidateJobsPanel({ embedded = false }: { embedded?: boolean } = {}) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#FF7A00] border-t-transparent rounded-full"></div></div>}>
            <JobsContent embedded={embedded} />
        </Suspense>
    );
}
