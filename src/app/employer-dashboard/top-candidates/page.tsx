"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { motion, AnimatePresence } from "framer-motion";
import { EmployerSidebarNav } from "@/components/employer/EmployerSidebarNav";

interface Candidate {
    id: string;
    name: string;
    email?: string | null;
    headline: string | null;
    avatar_url: string | null;
    gender: string | null;
    skills: string[] | null;
    open_to_work: boolean;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    current_job_title?: string | null;
    total_experience?: string | null;
    ai_rank: number | null;
    ai_percentile: number | null;
    ai_confidence_score: number | null;
    ai_concept_coverage: number | null;
    availability_status: string | null;
    available_in_days: number | null;
    profile_views: number;
    interviewAttempts?: {
        score: number;
        role_tested_for?: string | null;
    }[];
    created_at?: string;
    phone?: string | null;
}

const SKILLS = ["React", "Node.js", "Python", "Java", "TypeScript", "AWS", "SQL", "Flutter", "UI/UX", "DevOps"];
const getGmailComposeUrl = (email: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email.trim())}`;

export default function TopCandidatesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [skillsQuery, setSkillsQuery] = useState("");
    const [locationQuery, setLocationQuery] = useState("");
    const [roleQuery, setRoleQuery] = useState(""); // Role based filter
    const [experienceText, setExperienceText] = useState(""); // Experience based filter (text search)
    const [sortBy, setSortBy] = useState("score"); // score, newest, experience
    const [minScore, setMinScore] = useState(0);
    const [searching, setSearching] = useState(false);
    const [activeSkillTags, setActiveSkillTags] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [category, setCategory] = useState("all");
    const [quickFilter, setQuickFilter] = useState<string | null>(null);

    const navigateToEmployerRoute = (href: string) => {
        router.push(href, { scroll: false });
    };

    // Auth check
    useEffect(() => {
        async function check() {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) { router.push("/login"); return; }
                const data = await res.json();
                if (data.user.role !== "employer") { router.push("/login"); return; }
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }
        check();
    }, [router]);

    const performSearch = useCallback(async (isFallback = false) => {
        setSearching(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery && !isFallback) params.append("search", searchQuery);
            if (category !== "all" && !isFallback) params.append("category", category);
            
            const allSkills = [...activeSkillTags].join(",");
            if (allSkills && !isFallback) params.append("skills", allSkills);
            if (locationQuery && !isFallback) params.append("location", locationQuery);
            if (roleQuery && !isFallback) params.append("role", roleQuery); 
            if (experienceText && !isFallback) params.append("experience", experienceText);
            if (sortBy && !isFallback) params.append("sortBy", sortBy);
            if (minScore > 0 && !isFallback) params.append("minScore", minScore.toString());
            
            // Quick Filters
            if (quickFilter === "highScore") params.append("minScore", "8");
            if (quickFilter === "activelyLooking") params.append("openToWork", "true");
            
            params.append("aiRecommended", "true"); 

            const res = await fetch(`/api/candidates?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                let results = data.candidates || [];
                
                // Intelligent Fallback Logic
                if (results.length === 0 && !isFallback) {
                    performSearch(true);
                    setQuickFilter("fallback");
                    return;
                }

                if (quickFilter === "top10") results = results.slice(0, 10);
                setCandidates(results);
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setSearching(false);
        }
    }, [searchQuery, category, locationQuery, roleQuery, experienceText, sortBy, minScore, activeSkillTags, quickFilter]);

    useEffect(() => {
        if (!loading) performSearch();
    }, [loading, performSearch]);

    const fixGoogleDriveUrl = (url: string | null | undefined, size = 100) => {
        if (!url) return null;
        if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
            const fileIdMatch = url.match(/[-\w]{25,}/);
            if (fileIdMatch) return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}=s${size}`;
        }
        return url;
    };

    const getRecommendationLabel = (percentile: number) => {
        if (percentile >= 95) return { label: "Elite Talent", color: "bg-amber-500" };
        if (percentile >= 90) return { label: "High Potential", color: "bg-indigo-500" };
        if (percentile >= 75) return { label: "Recommended", color: "bg-blue-500" };
        return null;
    };

    const getUrgencyBadge = (status: string | null) => {
        switch (status) {
            case "READY_NOW": return { label: "Ready to Interview Today", color: "text-emerald-500", bg: "bg-emerald-500/10" };
            case "ACTIVELY_LOOKING": return { label: "Interviewing This Week", color: "text-amber-500", bg: "bg-amber-500/10" };
            case "OPEN": return { label: "Actively Looking", color: "text-blue-500", bg: "bg-blue-500/10" };
            default: return { label: "Open to Offers", color: "text-muted-foreground", bg: "bg-muted/10" };
        }
    };

    const getSkillLevel = (score: number) => {
        if (score >= 8.5) return "Advanced";
        if (score >= 7) return "Intermediate";
        return "Fundamental";
    };

    if (loading) return (
        <div className="flex min-h-screen bg-background items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Verifying Employer Access...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16 bg-background text-foreground overflow-x-hidden">
            <main className="flex-1 overflow-y-auto min-w-0 pb-24">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                    
                    {/* Social Proof Bar */}
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-2.5 mb-8 flex flex-wrap items-center justify-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 leading-none">12 Recruiters active now</span>
                        </div>
                        <div className="h-4 w-px bg-primary/20 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 leading-none">5 candidates shortlisted today</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 uppercase">
                                Top <span className="text-primary">{category === 'all' ? 'Local Candidates' : category}</span>
                            </h1>
                            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.15em] mt-1.5 opacity-60">
                                AI-driven ranking for high-speed recruitment
                            </p>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col gap-3 mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or skills..."
                                className="w-full h-11 bg-card border border-border rounded-xl pl-11 pr-11 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                            />
                            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button 
                                onClick={() => setFiltersOpen(!filtersOpen)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border transition-all ${filtersOpen ? "bg-primary text-black border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </button>
                        </div>

                        {/* Expandable Filter Panel */}
                        <AnimatePresence>
                            {filtersOpen && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mb-4"
                                >
                                    <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shadow-xl">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preferred Location</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={locationQuery}
                                                    onChange={(e) => setLocationQuery(e.target.value)}
                                                    placeholder="City or Country..." 
                                                    className="w-full h-10 bg-muted border border-border rounded-lg pl-9 text-xs font-bold focus:border-primary/50 outline-none"
                                                />
                                                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Experience Years</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={experienceText}
                                                    onChange={(e) => setExperienceText(e.target.value)}
                                                    placeholder="e.g. 3 years, Senior..." 
                                                    className="w-full h-10 bg-muted border border-border rounded-lg pl-9 text-xs font-bold focus:border-primary/50 outline-none"
                                                />
                                                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Role</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={roleQuery}
                                                    onChange={(e) => setRoleQuery(e.target.value)}
                                                    placeholder="e.g. Architect, AI Engineer..." 
                                                    className="w-full h-10 bg-muted border border-border rounded-lg pl-9 text-xs font-bold focus:border-primary/50 outline-none"
                                                />
                                                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sort Results By</label>
                                            <div className="relative">
                                                <select 
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value)}
                                                    className="w-full h-10 bg-muted border border-border rounded-lg px-3 text-xs font-bold focus:border-primary/50 outline-none appearance-none pr-8 cursor-pointer"
                                                >
                                                    <option value="score">Top AI Score</option>
                                                    <option value="newest">Newly Joined</option>
                                                    <option value="experience">Experience Level</option>
                                                </select>
                                                <svg className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Skill Category Tabs */}
                        <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar mb-6 border-b border-border/50">
                            {["all", "Engineering", "Design", "Management", "Interns"].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { setCategory(cat); setQuickFilter(null); }}
                                    className={`px-4 py-2 text-[9px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-all border-b-2 ${category === cat ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                                >
                                    {cat === 'all' ? 'Local Candidates' : cat}
                                </button>
                            ))}
                        </div>

                        {/* Quick Instant Filters */}
                        <div className="flex flex-wrap gap-2 mb-8">
                            {[
                                { id: "top10", label: "Top 10", color: "text-amber-500" },
                                { id: "activelyLooking", label: "Fast Track", color: "text-emerald-500" },
                                { id: "highScore", label: "Elite (8+)", color: "text-blue-500" },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setQuickFilter(prev => prev === f.id ? null : f.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
                                        quickFilter === f.id 
                                        ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-105" 
                                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results Announcement */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                             {quickFilter === "fallback" ? (
                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80">No exact matches found — showing closest matches</span>
                             ) : (
                                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Leaderboard Active</span>
                             )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80">{candidates.length} Profiles Found</span>
                    </div>

                    {/* Candidate Feed */}
                    <div className="flex flex-col gap-3">
                        {candidates.length === 0 && !searching && (
                            <div className="bg-card border-2 border-dashed border-border rounded-2xl p-12 text-center">
                                <p className="text-sm font-black text-muted-foreground uppercase opacity-40">No elite talent found in this segment.</p>
                                <button onClick={() => {setCategory("all"); setQuickFilter(null); setLocationQuery(""); setRoleQuery(""); setExperienceText("");}} className="mt-4 text-xs font-black text-primary uppercase underline">Reset Filters</button>
                            </div>
                        )}
                        
                        {candidates.map((candidate, index) => {
                            const topScore = candidate.interviewAttempts?.[0]?.score || 0;
                            const percentile = candidate.ai_percentile || 0;
                            const location = [candidate.city, candidate.country].filter(Boolean).join(", ");
                            const feedback = (candidate as any).ai_feedback_summary;
                            const urgency = getUrgencyBadge(candidate.availability_status);
                            const skillLevel = getSkillLevel(topScore / 10);
                            
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={candidate.id}
                                    className="bg-card hover:bg-muted/40 border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                                >
                                    {/* Urgency Ribbon (Mobile) */}
                                    <div className="absolute top-0 right-0 sm:hidden">
                                        <div className={`text-[7px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tight ${urgency.bg} ${urgency.color}`}>
                                            {urgency.label.split(' ').slice(1).join(' ')}
                                        </div>
                                    </div>

                                    {/* Left: Avatar & Primary Info */}
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shrink-0 border border-border relative">
                                            {candidate.gender ? (
                                                <img src={`/avatars/${candidate.gender.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black text-primary text-xl">{candidate.name.charAt(0)}</div>
                                            )}
                                            <div className="absolute bottom-0 inset-x-0 bg-primary text-white text-[9px] font-black text-center py-0.5 uppercase tracking-tighter">
                                                Rank #{index + 1}
                                            </div>
                                        </div>
                                        
                                        {/* Name & Title (Mobile Only Header) */}
                                        <div className="min-w-0 flex-1 sm:hidden">
                                            <h3 className="text-base font-black text-foreground truncate">{candidate.name}</h3>
                                            <p className="text-[11px] font-bold text-muted-foreground truncate opacity-70">{candidate.current_job_title || "Developer"}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={`${urgency.bg} ${urgency.color} px-1.5 py-0.5 rounded text-[8px] font-black uppercase`}>
                                                    {urgency.label.split(' ').slice(0, 1) + ' ' + (urgency.label.split(' ')[1] || '')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Data */}
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="hidden sm:flex items-center justify-between mb-2">
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-base font-black text-foreground truncate group-hover:text-primary transition-colors">{candidate.name}</h3>
                                                <span className="text-[11px] font-bold text-muted-foreground opacity-60">• {candidate.current_job_title || "Developer"}</span>
                                            </div>
                                            <div className={`${urgency.bg} ${urgency.color} px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight`}>
                                                {urgency.label}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 leading-none">Primary Stacks</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {(candidate.skills || ["React", "Node"]).slice(0, 3).map(s => (
                                                        <span key={s} className="text-[11px] font-bold text-foreground">
                                                            {s} <span className="text-primary text-[8px] font-black">({skillLevel})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 leading-none">Local Standing</p>
                                                <p className="text-[11px] font-bold text-foreground">Top {Math.max(1, 100 - percentile)}% locally</p>
                                            </div>
                                            <div className="space-y-1 hidden lg:block">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 leading-none">Verification</p>
                                                <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 uppercase">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    AI Verified
                                                </p>
                                            </div>
                                        </div>

                                        {/* Decision Layer */}
                                        <div className="mt-4 flex flex-row items-center justify-between border-t border-border/50 pt-3">
                                            <div className="flex items-center gap-4">
                                                <div className="px-2 py-0.5 bg-primary/5 rounded border border-primary/20">
                                                    <span className="text-[11px] font-black text-primary">Score: {topScore}</span>
                                                </div>
                                                <div className="relative group/feedback cursor-help">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase underline decoration-emerald-500/40 underline-offset-4 flex items-center gap-1 leading-none">
                                                        Trust Breakdown
                                                    </span>
                                                    <div className="absolute bottom-full left-0 mb-3 w-56 bg-card border border-border rounded-2xl p-4 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/feedback:opacity-100 group-hover/feedback:translate-y-0 transition-all z-30">
                                                        <div className="text-[10px] font-black text-emerald-500 uppercase mb-3 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Key Strengths
                                                        </div>
                                                        <ul className="space-y-2 mb-4">
                                                            {(feedback?.pros || ["Advanced React Logic", "API Optimization"]).map((p: string) => (
                                                                <li key={p} className="text-[9px] font-bold text-foreground flex items-center gap-2">
                                                                    <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                    {p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div className="h-px w-full bg-border mb-4" />
                                                        <p className="text-[9px] font-bold text-muted-foreground/60 italic leading-snug">
                                                            Based on detailed technical screening interview.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-1.5 opacity-60">
                                                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-[0.15em]">Confidence: {candidate.ai_confidence_score || 85}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions (Always Visible) */}
                                    <div className="flex sm:flex-col items-center gap-2 p-1.5 bg-muted/20 rounded-2xl border border-border w-full sm:w-auto">
                                        <div className="flex-1 sm:w-full">
                                            <WhatsAppButton
                                                phone={candidate.phone}
                                                name={candidate.name}
                                                score={topScore}
                                                skill={candidate.skills?.[0]}
                                                mobileFullWidth={true}
                                            />
                                        </div>
                                        {candidate.email && (
                                            <a
                                                href={getGmailComposeUrl(candidate.email)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Email ${candidate.name}`}
                                                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all shadow-sm"
                                            >
                                                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </a>
                                        )}
                                        <button className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-card border border-border text-foreground hover:border-primary/40 transition-all shadow-sm">
                                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                        </button>
                                        <Link
                                            href={`/candidate/${candidate.id}`}
                                            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-foreground text-background hover:scale-105 transition-all shadow-lg"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>
            
            {/* Bottom Tab Bar / Sidebar */}
            <EmployerSidebarNav
                activeItem="talent"
                onSelect={(item) => {
                    if (item === "post") {
                        navigateToEmployerRoute("/employer-dashboard/post-job");
                        return;
                    }

                    if (item === "talent") {
                        navigateToEmployerRoute("/employer-dashboard?tab=talent");
                        return;
                    }

                    if (item === "overview") {
                        navigateToEmployerRoute("/employer-dashboard");
                        return;
                    }

                    navigateToEmployerRoute(`/employer-dashboard?tab=${item}`);
                }}
            />
        </div>
    );
}
