"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { EmployerSidebarNav } from "@/components/employer/EmployerSidebarNav";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { EmployerSubscriptionModal } from "@/components/employer/EmployerSubscriptionModal";
import type {
    EmployerBillingCycle,
    EmployerPlanKey,
    EmployerSubscriptionSnapshot,
} from "@/lib/employer-subscription-config";

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
    interviewAttempts?: {
        score: number;
        role_tested_for?: string | null;
        communication_score?: number | null;
        technical_score?: number | null;
    }[];
    created_at?: string;
    phone?: string | null;
}

const POPULAR_SKILLS = ["React", "Node.js", "Python", "Java", "TypeScript", "AWS", "SQL", "Flutter", "UI/UX", "DevOps"];

export default function EmployerTalentPanel({ embedded = false }: { embedded?: boolean } = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [skillsQuery, setSkillsQuery] = useState("");
    const [roleQuery, setRoleQuery] = useState("");
    const [locationQuery, setLocationQuery] = useState("");
    const [experienceQuery, setExperienceQuery] = useState("");
    const [sortBy, setSortBy] = useState("score");
    const [minScore, setMinScore] = useState("");
    const [maxScore, setMaxScore] = useState("");
    const [openToWorkOnly, setOpenToWorkOnly] = useState(false);
    const [aiRecommendedOnly, setAiRecommendedOnly] = useState(false);
    const [searching, setSearching] = useState(false);
    const [activeSkillTags, setActiveSkillTags] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [totalFound, setTotalFound] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [subscriptionSnapshot, setSubscriptionSnapshot] = useState<EmployerSubscriptionSnapshot | null>(null);
    const [purchasingPlanKey, setPurchasingPlanKey] = useState<EmployerPlanKey | null>(null);
    const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const hasCompletedInitialSearch = useRef(false);
    const [plansModalCopy, setPlansModalCopy] = useState({
        title: "Unlock Employer Premium Access",
        subtitle: "Admin-configured monthly and yearly plans activate instantly in test mode until Razorpay is connected.",
    });

    // Auth check
    useEffect(() => {
        async function check() {
            try {
                const [res, subscriptionRes] = await Promise.all([
                    fetch("/api/profile"),
                    fetch("/api/employer/subscription"),
                ]);

                if (!res.ok) { router.push("/login"); return; }
                const data = await res.json();
                if (data.user.role !== "employer") { router.push("/login"); return; }

                if (subscriptionRes.ok) {
                    const subscriptionData = await subscriptionRes.json();
                    setSubscriptionSnapshot(subscriptionData);
                }
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }
        check();
    }, [router]);

    useEffect(() => {
        if (!embedded && pathname === "/employer-dashboard/candidates") {
            router.replace("/employer-dashboard?tab=talent", { scroll: false });
        }
    }, [embedded, pathname, router]);

    useEffect(() => {
        router.prefetch("/employer-dashboard");
        router.prefetch("/employer-dashboard?tab=applicants");
        router.prefetch("/employer-dashboard?tab=settings");
        router.prefetch("/employer-dashboard/post-job");
    }, [router]);

    const canSourceCandidates = !(subscriptionSnapshot?.monetizationEnabled) || Boolean(subscriptionSnapshot?.capabilities.canSourceCandidates);
    const canContactCandidates = !(subscriptionSnapshot?.monetizationEnabled) || Boolean(subscriptionSnapshot?.capabilities.canContactCandidates);
    const canAccessAiFeatures = !(subscriptionSnapshot?.monetizationEnabled) || Boolean(subscriptionSnapshot?.capabilities.canAccessAiFeatures);

    const openPlansModal = (title: string, subtitle: string) => {
        setSubscriptionMessage(null);
        setPlansModalCopy({ title, subtitle });
        setShowPlansModal(true);
    };

    const navigateToEmployerRoute = (href: string) => {
        router.push(href, { scroll: false });
    };

    const fixGoogleDriveUrl = (url: string | null | undefined, size = 100) => {
        if (!url) return null;
        if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
            const fileIdMatch = url.match(/[-\w]{25,}/);
            if (fileIdMatch) {
                return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}=s${size}`;
            }
        }
        return url;
    };

    const performSearch = useCallback(async () => {
        setSearching(true);
        setErrorMessage(null);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            const allSkills = [...activeSkillTags, ...(skillsQuery ? [skillsQuery] : [])].join(",");
            if (allSkills) params.append("skills", allSkills);
            if (roleQuery) params.append("role", roleQuery);
            if (locationQuery) params.append("location", locationQuery);
            if (experienceQuery) params.append("experience", experienceQuery);
            if (minScore) params.append("minScore", minScore);
            if (maxScore) params.append("maxScore", maxScore);
            if (sortBy) params.append("sortBy", sortBy);
            if (openToWorkOnly) params.append("openToWork", "true");
            if (aiRecommendedOnly) params.append("aiRecommended", "true");

            const res = await fetch(`/api/candidates?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setCandidates([]);
                setTotalFound(0);
                setErrorMessage(data.error || "Unable to load candidates right now.");
                return;
            }

            setCandidates(data.candidates || []);
            setTotalFound(data.total ?? data.candidates?.length ?? 0);
        } catch (err) {
            console.error("Search error:", err);
            setCandidates([]);
            setTotalFound(0);
            setErrorMessage("Unable to load candidates right now.");
        } finally {
            setSearching(false);
        }
    }, [searchQuery, skillsQuery, roleQuery, locationQuery, experienceQuery, sortBy, minScore, maxScore, openToWorkOnly, aiRecommendedOnly, activeSkillTags]);

    useEffect(() => {
        if (loading || !canSourceCandidates) return;

        if (!hasCompletedInitialSearch.current) {
            hasCompletedInitialSearch.current = true;
            void performSearch();
            return;
        }

        const t = setTimeout(() => {
            void performSearch();
        }, 400);
        return () => clearTimeout(t);
    }, [loading, canSourceCandidates, performSearch, searchQuery, skillsQuery, roleQuery, locationQuery, experienceQuery, sortBy, minScore, maxScore, openToWorkOnly, aiRecommendedOnly, activeSkillTags]);

    const toggleSkillTag = (skill: string) => {
        setActiveSkillTags(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const clearAllFilters = () => {
        setSearchQuery("");
        setSkillsQuery("");
        setRoleQuery("");
        setLocationQuery("");
        setExperienceQuery("");
        setSortBy("score");
        setMinScore("");
        setMaxScore("");
        setOpenToWorkOnly(false);
        setAiRecommendedOnly(false);
        setActiveSkillTags([]);
    };

    const activeFilterCount = [
        skillsQuery,
        roleQuery,
        locationQuery,
        experienceQuery,
        sortBy !== "score" ? sortBy : "",
        minScore,
        maxScore,
        openToWorkOnly ? "1" : "",
        aiRecommendedOnly ? "1" : "",
        ...activeSkillTags
    ].filter(Boolean).length;

    if (loading) {
        return (
            <div className={`flex items-center justify-center ${embedded ? "min-h-[320px]" : "min-h-screen bg-background pt-16"}`}>
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const handlePurchaseSubscription = async (planKey: EmployerPlanKey, billingCycle: EmployerBillingCycle) => {
        setPurchasingPlanKey(planKey);
        setSubscriptionMessage(null);

        try {
            const res = await fetch("/api/employer/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planKey, billingCycle }),
            });
            const data = await res.json();

            if (!res.ok) {
                setSubscriptionMessage({ type: "error", text: data.error || "Unable to activate the subscription right now." });
                return;
            }

            setSubscriptionSnapshot(data.snapshot || null);
            setSubscriptionMessage({ type: "success", text: data.message || "Subscription activated." });
            await performSearch();
        } catch (error) {
            console.error("Employer subscription purchase error:", error);
            setSubscriptionMessage({ type: "error", text: "Network error while activating the subscription." });
        } finally {
            setPurchasingPlanKey(null);
        }
    };

    const subscriptionModal = (
        <EmployerSubscriptionModal
            isOpen={showPlansModal}
            onClose={() => setShowPlansModal(false)}
            snapshot={subscriptionSnapshot}
            onPurchase={handlePurchaseSubscription}
            purchasingPlanKey={purchasingPlanKey}
            message={subscriptionMessage}
            title={plansModalCopy.title}
            subtitle={plansModalCopy.subtitle}
        />
    );

    const pageContent = (
        <div className={embedded ? "w-full" : "max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 md:py-8"}>

                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                            {!embedded && (
                                <Link
                                    href="/employer-dashboard"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </Link>
                            )}
                            <h1 className="text-xl sm:text-[22px] font-semibold text-foreground tracking-tight">
                                Top <span className="text-primary">Tier Talent</span>
                            </h1>
                        </div>
                        <p className={`text-secondary text-xs sm:text-sm font-medium ${embedded ? "" : "ml-6 sm:ml-7"}`}>
                            Platform-wide ranking of candidates with the highest AI evaluation scores and technical proficiency.
                        </p>
                    </div>

                    {!canSourceCandidates ? (
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary mb-2">Premium sourcing</p>
                                <h2 className="text-xl font-black text-foreground mb-2">Candidate discovery is a paid employer feature</h2>
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    The core employer workflow stays free, but direct candidate sourcing is unlocked through Starter, Growth, or Elite plans.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => openPlansModal(
                                    "Unlock Candidate Discovery",
                                    "Choose a monthly or yearly employer plan to start sourcing candidates directly. Test-mode activation is instant until Razorpay is connected."
                                )}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-black transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                            >
                                View Plans
                            </button>
                        </div>
                    ) : (
                    <>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, job title, or keyword..."
                            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 h-12 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm"
                        />
                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>

                    {/* Popular Skill Tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        {POPULAR_SKILLS.map(skill => (
                            <button
                                key={skill}
                                onClick={() => toggleSkillTag(skill)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeSkillTags.includes(skill)
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                                    }`}
                            >
                                {skill}
                            </button>
                        ))}
                    </div>

                    {/* Filters Panel Toggle */}
                    <div className="mb-5">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setFiltersOpen(!filtersOpen)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setFiltersOpen(!filtersOpen);
                                    }
                                }}
                                className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                                    </svg>
                                    <span>Advanced Filters</span>
                                    {activeFilterCount > 0 && (
                                        <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeFilterCount > 0 && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); clearAllFilters(); }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    clearAllFilters();
                                                }
                                            }}
                                            className="text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                        >
                                            Clear all
                                        </span>
                                    )}
                                    <svg
                                        className={`w-4 h-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {filtersOpen && (
                                <div className="border-t border-border px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Technical Skills</label>
                                            <input
                                                type="text"
                                                value={skillsQuery}
                                                onChange={(e) => setSkillsQuery(e.target.value)}
                                                placeholder="React, Python, AWS..."
                                                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 h-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Role / Title</label>
                                            <input
                                                type="text"
                                                value={roleQuery}
                                                onChange={(e) => setRoleQuery(e.target.value)}
                                                placeholder="e.g. Frontend, CTO..."
                                                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 h-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Location</label>
                                            <input
                                                type="text"
                                                value={locationQuery}
                                                onChange={(e) => setLocationQuery(e.target.value)}
                                                placeholder="City or Country"
                                                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 h-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Experience Level</label>
                                            <input
                                                type="text"
                                                value={experienceQuery}
                                                onChange={(e) => setExperienceQuery(e.target.value)}
                                                placeholder="e.g. Senior, 3 years"
                                                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 h-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Sort Results By</label>
                                            <div className="relative">
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value)}
                                                    className="w-full bg-muted/50 border border-border rounded-lg px-3.5 h-10 text-foreground focus:outline-none focus:border-primary transition-all text-sm font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="score">Top AI Score</option>
                                                    <option value="newest">Newest Profiles</option>
                                                    <option value="experience">Years of Experience</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">AI Score Range</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0" max="10"
                                                    value={minScore}
                                                    onChange={(e) => setMinScore(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 h-10 text-foreground text-center focus:outline-none focus:border-primary transition-all text-sm font-bold"
                                                />
                                                <span className="text-muted-foreground font-black">—</span>
                                                <input
                                                    type="number"
                                                    min="0" max="10"
                                                    value={maxScore}
                                                    onChange={(e) => setMaxScore(e.target.value)}
                                                    placeholder="10"
                                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 h-10 text-foreground text-center focus:outline-none focus:border-primary transition-all text-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-end gap-2">
                                        <label className="flex items-center cursor-pointer gap-2 group">
                                            <div className="relative shrink-0">
                                                <input type="checkbox" checked={openToWorkOnly} onChange={(e) => setOpenToWorkOnly(e.target.checked)} className="sr-only" />
                                                <div className={`block w-10 h-5 rounded-full transition-all duration-300 ${openToWorkOnly ? "bg-primary" : "bg-muted border border-border"}`} />
                                                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${openToWorkOnly ? "translate-x-5" : ""}`} />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${openToWorkOnly ? "text-primary" : "text-muted-foreground"}`}>Open to work</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer gap-2 group">
                                            <div className="relative shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={aiRecommendedOnly}
                                                    onChange={(e) => {
                                                        if (e.target.checked && !canAccessAiFeatures) {
                                                            openPlansModal(
                                                                "Unlock AI Candidate Discovery",
                                                                "AI-assisted sourcing, best-candidate discovery, and premium fresh-match tools are available on the Elite employer plan."
                                                            );
                                                            return;
                                                        }

                                                        setAiRecommendedOnly(e.target.checked);
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`block w-10 h-5 rounded-full transition-all duration-300 ${aiRecommendedOnly ? "bg-indigo-500" : "bg-muted border border-border"}`} />
                                                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${aiRecommendedOnly ? "translate-x-5" : ""}`} />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${aiRecommendedOnly ? "text-indigo-500" : "text-muted-foreground"}`}>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                AI Assessed
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    </>
                    )}

                    {canSourceCandidates && (
                    <>
                    {/* Results count */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-muted-foreground font-bold">
                            {searching
                                ? "Searching..."
                                : `${totalFound} candidate${totalFound !== 1 ? "s" : ""} found`}
                        </p>
                        {activeSkillTags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {activeSkillTags.map(s => (
                                    <span key={s} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        {s}
                                        <button onClick={() => toggleSkillTag(s)} className="hover:text-red-500 transition-colors">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">
                            {errorMessage}
                        </div>
                    )}

                    {/* Candidate Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {candidates.length === 0 && !searching && !errorMessage ? (
                            <div className="col-span-full py-20 text-center bg-card border border-dashed border-border rounded-2xl">
                                <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-8 h-8 text-muted-foreground opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">No profiles matched</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                    Try adjusting your search or removing filters to see more candidates.
                                </p>
                                <button onClick={clearAllFilters} className="mt-5 text-primary text-sm font-bold hover:underline">
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            candidates.map((candidate, index) => {
                                const topScore = candidate.interviewAttempts?.[0];
                                const skills = Array.isArray(candidate.skills) ? candidate.skills as string[] : [];
                                const location = [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ");
                                const isNew = candidate.created_at ? (new Date().getTime() - new Date(candidate.created_at).getTime() < 24 * 60 * 60 * 1000) : false;
                                const candidateAvatarUrl = candidate.avatar_url ? fixGoogleDriveUrl(candidate.avatar_url) : null;
                                const candidatePlaceholderAvatar = `/avatars/${(candidate.gender || "male").toLowerCase()}.png`;

                                return (
                                    <div
                                        key={candidate.id}
                                        className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 group flex flex-col relative"
                                    >
                                        {/* Rank Badge */}
                                        {index < 3 && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white shadow-lg ${index === 0 ? "bg-amber-500 scale-110" : index === 1 ? "bg-slate-400" : "bg-amber-700"}`}>
                                                    {index + 1}
                                                </div>
                                            </div>
                                        )}
                                        {/* Top accent bar */}
                                        <div className={`h-1 w-full transition-colors duration-300 ${index < 3 ? "bg-primary" : "bg-muted group-hover:bg-primary"}`} />

                                        <div className="p-4 sm:p-5 flex flex-col flex-1">
                                            {/* Avatar + Name Link */}
                                            <Link href={`/candidate/${candidate.id}`} className="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4 group/info">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0 shadow-sm group-hover/info:border-primary/50 transition-colors">
                                                    {candidateAvatarUrl ? (
                                                        <img src={candidateAvatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                    ) : (
                                                        <img src={candidatePlaceholderAvatar} alt="Default avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover/info:text-primary transition-colors">
                                                            {candidate.name}
                                                        </h3>
                                                        {isNew && (
                                                            <span className="bg-red-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                                                                NEW
                                                            </span>
                                                        )}
                                                        {candidate.open_to_work && (
                                                            <span className="bg-[#FFF3E8] text-primary text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                                                                Open
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-[10px] sm:text-[11px] font-medium mt-0.5 truncate group-hover/info:text-foreground transition-colors">
                                                        {candidate.current_job_title || candidate.headline || "Candidate"}
                                                    </p>
                                                    {location && (
                                                        <p className="text-muted-foreground text-[9px] sm:text-[10px] font-bold mt-1 flex items-center gap-1 opacity-70">
                                                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {location}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* AI Score badge */}
                                            {topScore && (
                                                <div className="mb-2.5 sm:mb-3 bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-2.5 sm:p-3">
                                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                        <span className="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                            AI Score
                                                        </span>
                                                        <span className="text-indigo-500 font-black text-sm sm:text-base">
                                                            {topScore.score}<span className="text-[10px] sm:text-xs opacity-50">/10</span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-indigo-500/10 rounded-full h-1 sm:h-1.5">
                                                        <div
                                                            className="h-1 sm:h-1.5 rounded-full bg-indigo-500 transition-all"
                                                            style={{ width: `${topScore.score * 10}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2.5 sm:gap-3 mt-1.5 sm:mt-2 text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase">
                                                        <span>Comm: {topScore.communication_score ?? Math.ceil(topScore.score / 2)}/5</span>
                                                        <span>Tech: {topScore.technical_score ?? Math.floor(topScore.score / 2)}/5</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Skill Tags */}
                                            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                                                {skills.length > 0 ? (
                                                    <>
                                                        {skills.slice(0, 4).map((skill, i) => (
                                                            <span
                                                                key={i}
                                                                className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border ${activeSkillTags.includes(skill)
                                                                    ? "bg-primary/10 text-primary border-primary/30"
                                                                    : "bg-muted text-muted-foreground border-border"
                                                                    }`}
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {skills.length > 4 && (
                                                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-muted text-muted-foreground border border-border">
                                                                +{skills.length - 4}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[9px] sm:text-[10px] text-muted-foreground italic">No skills listed</span>
                                                )}
                                            </div>

                                            {/* Experience */}
                                            {candidate.total_experience && (
                                                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
                                                    </svg>
                                                    {candidate.total_experience}
                                                </p>
                                            )}

                                            {/* Actions */}
                                            <div className="mt-auto flex gap-1.5 sm:gap-2 pt-2.5 sm:pt-3 border-t border-border">
                                                <Link
                                                    href={`/candidate/${candidate.id}`}
                                                    className="flex-1 flex items-center justify-center bg-muted hover:bg-border text-foreground text-[10px] sm:text-[11px] font-bold py-2 sm:py-2.5 rounded-xl transition-all border border-border group-hover:border-primary/20"
                                                >
                                                    View Profile
                                                </Link>
                                                {canContactCandidates ? (
                                                    <>
                                                        <a
                                                            href={`mailto:${candidate.email || ""}?subject=${encodeURIComponent("Job Opportunity")}&body=${encodeURIComponent("Hi, I came across your profile and would like to connect regarding a potential opportunity.")}`}
                                                            className="flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground text-[10px] sm:text-[11px] font-bold py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl transition-all border border-border"
                                                            title="Contact Candidate by Email"
                                                        >
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </a>
                                                        <WhatsAppButton
                                                            phone={candidate.phone}
                                                            name={candidate.name}
                                                            score={topScore?.score}
                                                            skill={skills[0]}
                                                            mobileFullWidth={false}
                                                        />
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => openPlansModal(
                                                            "Unlock Direct Candidate Contact",
                                                            "Upgrade to a plan with contact access to reveal verified candidate phone numbers, resumes, and direct outreach tools."
                                                        )}
                                                        className="flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary transition-all hover:bg-primary/15"
                                                    >
                                                        Unlock Contact
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Loading skeleton cards */}
                        {searching && candidates.length === 0 && (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-muted rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-muted rounded w-2/3" />
                                            <div className="h-2 bg-muted rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <div className="h-2 bg-muted rounded w-full" />
                                        <div className="h-2 bg-muted rounded w-3/4" />
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        <div className="h-6 w-14 bg-muted rounded-md" />
                                        <div className="h-6 w-14 bg-muted rounded-md" />
                                        <div className="h-6 w-14 bg-muted rounded-md" />
                                    </div>
                                    <div className="h-9 bg-muted rounded-xl" />
                                </div>
                            ))
                        )}
                    </div>
                    </>
                    )}
        </div>
    );

    if (embedded) {
        return (
            <>
                {pageContent}
                {subscriptionModal}
            </>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16 bg-background text-foreground relative transition-all duration-300 overflow-x-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -ml-64 -mb-64 pointer-events-none z-0" />
            <main className="flex-1 p-4 sm:p-5 lg:p-8 overflow-y-auto w-full min-w-0 pb-24 scroll-smooth [backface-visibility:hidden] [transform:translateZ(0)] [scrollbar-gutter:stable]">
                {pageContent}
            </main>

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

            {subscriptionModal}
        </div>
    );
}
