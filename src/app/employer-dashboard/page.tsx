"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import EmployerTalentPanel from "@/components/employer/EmployerTalentPanel";
import { EmployerSidebarNav } from "@/components/employer/EmployerSidebarNav";
import { FreshMatchesWidget } from "@/components/employer/FreshMatchesWidget";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { ScheduleInterviewModal } from "@/components/interviews/ScheduleInterviewModal";
import { EmployerSubscriptionModal } from "@/components/employer/EmployerSubscriptionModal";
import type {
    EmployerBillingCycle,
    EmployerPlanKey,
    EmployerSubscriptionSnapshot,
} from "@/lib/employer-subscription-config";

interface Job {
    id: string;
    status: string;
    job_title: string;
    company_name: string;
    job_category: string;
    job_type: string;
    work_model: string;
    country: string;
    state: string;
    city: string;
    salary_type: string;
    salary_min: number;
    salary_max: number;
    currency: string;
    experience_min: number;
    experience_max: number;
    education_level: string;
    required_skills: string[];
    openings: number;
    shift_type?: string;
    benefits?: string[];
    application_deadline?: string;
    hr_contact_name: string;
    hr_contact_phone: string;
    created_at: string;
    external_apply_url?: string;
    applications: Application[];
}

interface Application {
    id: string;
    applied_at: string;
    application_status: string;
    resume_url: string | null;
    applicant_name: string;
    candidate: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        gender: string | null;
        headline?: string | null;
        bio?: string | null;
        phone?: string | null;
        country?: string | null;
        state?: string | null;
        city?: string | null;
        skills?: any;
        experience?: any;
        education?: any;
        social_links?: any;
        resume_url?: string | null;
        certifications?: any;
        projects?: any;
        portfolio_links?: any;
        interviewAttempts?: any[];
    };
    phone?: string;
    address?: string;
    latest_interview_score?: any;
}

type Tab = "overview" | "talent" | "settings" | "applicants";
const normalizeEmployerTab = (value: string | null): Tab =>
    value === "talent" || value === "settings" || value === "applicants" ? value : "overview";
const LOCKED_APPLICATION_STATUSES = ["closed"];
const isApplicationStageLocked = (status: string) => LOCKED_APPLICATION_STATUSES.includes(status);
const getGmailComposeUrl = (email: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email.trim())}`;
// "talent" is rendered inside the main employer dashboard, just like the other in-app sections.

// --- Icons (SVG) ---
const Icons = {
    Dashboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Candidates: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Jobs: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Talent: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-5a3 3 0 00-6 0v5m6 0H7M12 11a3 3 0 100-6 3 3 0 000 6z" /></svg>,
    Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

// ── Custom Select (theme-aware, replaces native <select> to avoid OS grey popup) ──
function CustomSelect({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find(o => o.value === value)?.label;

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-left text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between"
            >
                <span className={!value ? "text-muted-foreground/60 text-sm" : "text-sm font-medium text-foreground"}>
                    {selectedLabel || placeholder || "Select..."}
                </span>
                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${value === opt.value ? 'text-primary font-semibold bg-primary/5' : 'text-foreground'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function EmployerDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
            <EmployerDashboardContent />
        </Suspense>
    );
}

function EmployerDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>(normalizeEmployerTab(searchParams.get("tab")));

    useEffect(() => {
        setTab(normalizeEmployerTab(searchParams.get("tab")));
    }, [searchParams]);

    const [selectedJobIdForApplicants, setSelectedJobIdForApplicants] = useState<string>("all");

    // Unified helper for Google Drive direct links (especially for avatars which need lh3.googleusercontent.com)
    const fixGoogleDriveUrl = (url: string | null, size = 1000) => {
        if (!url) return null;
        const fileIdMatch = url.match(/[-\w]{25,}/);
        if (fileIdMatch && (url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com"))) {
            return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}=s${size}`;
        }
        return url;
    };
    const [jobs, setJobs] = useState<Job[]>([]);
    const [timeFilter, setTimeFilter] = useState("all");
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [togglingJob, setTogglingJob] = useState<string | null>(null);
    const [deletingJob, setDeletingJob] = useState<string | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
    const [interviewModal, setInterviewModal] = useState<{ open: boolean; app: any | null }>({ open: false, app: null });

    // Profile Settings State
    const [companyName, setCompanyName] = useState("");
    const [companyBio, setCompanyBio] = useState("");
    const [companyWeb, setCompanyWeb] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [companyIndustry, setCompanyIndustry] = useState("");
    const [companySubIndustry, setCompanySubIndustry] = useState("");
    const [companyLogo, setCompanyLogo] = useState("");
    const [country, setCountry] = useState("");
    const [state, setState] = useState("");
    const [city, setCity] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [topCandidates, setTopCandidates] = useState<any[]>([]);
    const [subscriptionSnapshot, setSubscriptionSnapshot] = useState<EmployerSubscriptionSnapshot | null>(null);
    const [purchasingPlanKey, setPurchasingPlanKey] = useState<EmployerPlanKey | null>(null);
    const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [plansModalCopy, setPlansModalCopy] = useState({
        title: "Unlock Employer Premium Access",
        subtitle: "Choose a monthly or yearly plan. Test-mode activation is instant until Razorpay is connected.",
    });
    const logoInputRef = useRef<HTMLInputElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);

    const openPlansModal = (title: string, subtitle: string) => {
        setSubscriptionMessage(null);
        setPlansModalCopy({ title, subtitle });
        setShowPlansModal(true);
    };

    const navigateToEmployerRoute = (href: string) => {
        router.push(href, { scroll: false });
    };

    const loadTopCandidates = async () => {
        try {
            const topRes = await fetch("/api/candidates?aiRecommended=true&limit=5");
            if (topRes.ok) {
                const topData = await topRes.json();
                setTopCandidates(topData.candidates?.slice(0, 5) || []);
                return;
            }
        } catch (error) {
            console.error(error);
        }

        setTopCandidates([]);
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const profileRes = await fetch("/api/profile");
                if (!profileRes.ok) { router.push("/login"); return; }
                const profileData = await profileRes.json();
                if (profileData.user.role !== "employer") { router.push("/login"); return; }

                const subscriptionRes = await fetch("/api/employer/subscription");
                const subscriptionData = subscriptionRes.ok ? await subscriptionRes.json() : null;

                setProfile(profileData.user);
                setCompanyName(profileData.user.name || "");
                setCompanyBio(profileData.user.company_description || "");
                setCompanyWeb(profileData.user.company_website || "");
                setCompanySize(profileData.user.company_size || "");
                setCompanyIndustry(profileData.user.company_industry || "");
                setCompanySubIndustry(profileData.user.company_sub_industry || "");
                setCompanyLogo(profileData.user.company_logo_url || "");
                setCountry(profileData.user.country || "");
                setState(profileData.user.state || "");
                setCity(profileData.user.city || "");
                setSubscriptionSnapshot(subscriptionData);

                const [jobsRes] = await Promise.all([
                    fetch("/api/employer/jobs"),
                ]);

                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json();
                    setJobs(jobsData.jobs || []);
                }

                const canAccessAiDiscovery = subscriptionData?.monetizationEnabled
                    ? Boolean(subscriptionData.capabilities?.canAccessAiFeatures)
                    : true;

                if (canAccessAiDiscovery) {
                    await loadTopCandidates();
                } else {
                    setTopCandidates([]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [router]);

    useEffect(() => {
        router.prefetch("/employer-dashboard?tab=talent");
        router.prefetch("/employer-dashboard/post-job");
    }, [router]);

    const monetizationEnabled = subscriptionSnapshot?.monetizationEnabled ?? false;
    const canAccessAiFeatures = !monetizationEnabled || Boolean(subscriptionSnapshot?.capabilities.canAccessAiFeatures);

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

            const nextCanAccessAiDiscovery = data.snapshot?.monetizationEnabled
                ? Boolean(data.snapshot.capabilities?.canAccessAiFeatures)
                : true;

            if (nextCanAccessAiDiscovery) {
                await loadTopCandidates();
            } else {
                setTopCandidates([]);
            }
        } catch (error) {
            console.error(error);
            setSubscriptionMessage({ type: "error", text: "Network error while activating the subscription." });
        } finally {
            setPurchasingPlanKey(null);
        }
    };

    const handleUpdateStatus = async (applicationId: string, status: string) => {
        const currentApplication = jobs.flatMap(job => job.applications).find(app => app.id === applicationId);
        if (currentApplication && isApplicationStageLocked(currentApplication.application_status)) return;

        setUpdatingStatus(applicationId);
        try {
            const res = await fetch("/api/applications/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicationId, status }),
            });
            if (res.ok) {
                // Update local state
                setJobs(prevJobs => prevJobs.map(job => ({
                    ...job,
                    applications: job.applications.map(app =>
                        app.id === applicationId ? { ...app, application_status: status } : app
                    )
                })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleToggleJobStatus = async (jobId: string, currentStatus: string) => {
        setTogglingJob(jobId);
        try {
            const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
            const res = await fetch(`/api/employer/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTogglingJob(null);
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
        setDeletingJob(jobId);
        try {
            const res = await fetch(`/api/employer/jobs/${jobId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setJobs(jobs.filter(j => j.id !== jobId));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingJob(null);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        setSaveMsg(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/logo", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok && data.url) {
                setCompanyLogo(data.url);
                setSaveMsg({ type: "success", text: "Logo uploaded! Save changes to finalize." });
            } else {
                setSaveMsg({ type: "error", text: data.error || data.details || "Upload failed." });
            }
        } catch {
            setSaveMsg({ type: "error", text: "Network error during upload." });
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: companyName,
                    company_description: companyBio,
                    company_website: companyWeb,
                    company_size: companySize,
                    company_industry: companyIndustry,
                    company_sub_industry: companySubIndustry,
                    company_logo_url: companyLogo,
                    country,
                    state,
                    city
                }),
            });
            if (res.ok) {
                setSaveMsg({ type: "success", text: "Settings updated successfully!" });
            } else {
                setSaveMsg({ type: "error", text: "Failed to save." });
            }
        } catch {
            setSaveMsg({ type: "error", text: "Network error." });
        } finally {
            setSaving(false);
        }
    };

    const handleTabNavigation = (nextTab: Tab, selectedJobId: string = "all") => {
        if (nextTab === "applicants") {
            setSelectedJobIdForApplicants(selectedJobId);
        }

        if (nextTab === tab && (nextTab !== "applicants" || selectedJobId === selectedJobIdForApplicants)) {
            mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        setTab(nextTab);
        router.replace(nextTab === "overview" ? "/employer-dashboard" : `/employer-dashboard?tab=${nextTab}`, { scroll: false });
    };

    const handleLogout = async () => {
        try {
            // Client-side cleanup for immediate UI feedback
            document.cookie = "is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            // Hard reload clears memory state
            window.location.href = "/login";
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-32 md:w-48 h-12 md:h-16 animate-pulse">
                        <img 
                            src="/brand/talorix-white.png" 
                            alt="Talorix Logo" 
                            className="hidden dark:block w-full h-full object-contain opacity-80" loading="lazy" decoding="async" />
                        <img 
                            src="/brand/talorix-black.png" 
                            alt="Talorix Logo" 
                            className="block dark:hidden w-full h-full object-contain opacity-80" loading="lazy" decoding="async" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-1 w-24 bg-primary/20 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-primary animate-[shimmer_2s_infinite]" style={{ width: '40%' }}></div>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-40">Initialising <span className="text-primary italic">Workspace</span></p>
                    </div>
                </div>
            </div>
        );
    }


    const totalApplicants = jobs.reduce((acc, j) => acc + j.applications.length, 0);
    const resumesReceived = jobs.reduce((acc, j) => acc + j.applications.filter(a => a.resume_url && a.resume_url !== "No resume provided").length, 0);

    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16 bg-background relative transition-all duration-300 overflow-x-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none z-0" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -ml-64 -mb-64 pointer-events-none z-0" />

                {/* Main Content */}
                <main ref={mainContentRef} className="flex-1 p-4 sm:p-5 lg:p-8 overflow-y-auto w-full min-w-0 pb-24 scroll-smooth [backface-visibility:hidden] [transform:translateZ(0)] [scrollbar-gutter:stable]">
                    <div className="w-full max-w-[1180px] 2xl:max-w-[1240px] mx-auto">

                        {/* Dashboard Header */}
                        <div className={`flex items-center justify-between mb-5 sm:mb-6 bg-muted/40 p-3.5 sm:p-4 rounded-xl border border-border/50 ${tab === 'overview' ? '' : tab === 'talent' ? 'hidden' : 'hidden md:flex'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                                    {companyLogo ? (
                                        <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1.5" loading="lazy" decoding="async" />
                                    ) : profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Logo" className="w-full h-full object-contain p-1.5" loading="lazy" decoding="async" />
                                    ) : (
                                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4-14h1v1h-1V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-4-4v4h2v-4h-2z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-foreground font-bold text-xs leading-none uppercase tracking-wide">
                                        {tab === 'overview' ? 'Dashboard Overview' : 
                                         tab === 'talent' ? 'Talent Discovery' :
                                         tab === 'applicants' ? 'Applicants Pipeline' : 
                                         'Profile Settings'}
                                    </h2>
                                    <p className="text-muted-foreground text-[9px] uppercase font-bold tracking-[0.2em] mt-1 opacity-60">
                                        Employer Hub
                                    </p>
                                </div>
                            </div>
                            {tab === 'overview' && (
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-all flex items-center gap-2 group"
                                    title="Exit Dashboard"
                                >
                                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Logout</span>
                                </button>
                            )}
                        </div>



                        <AnimatePresence mode="wait" initial={false} key="employer-tabs">
                            {tab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.992 }}
                                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-6">
                                    <div className="space-y-0.5 sm:space-y-1">
                                        <h1 className="text-lg sm:text-[24px] font-bold text-foreground tracking-tight leading-tight">Employer <span className="text-primary opacity-90">Workspace</span></h1>
                                        <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold uppercase tracking-wider opacity-60">Real-time hiring velocity & pipeline monitoring.</p>
                                    </div>
                                    <Link href="/employer-dashboard/post-job" className="w-full sm:w-auto justify-center bg-primary hover:shadow-[0_8px_20px_-5px_rgba(255,122,0,0.4)] text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl transition-all flex items-center text-[10px] sm:text-xs uppercase tracking-widest active:scale-95">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"></path></svg>
                                        Post New Opening
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.82fr)] gap-5 lg:gap-6 mb-8 items-start">
                                         {/* TOP SECTION: FIRST VIEW - Top Talent Feed */}
                                <div className="min-w-0 rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-2 uppercase">
                                            Top Candidates <span className="text-primary opacity-80">Today</span>
                                        </h2>
                                        <Link href="/employer-dashboard?tab=talent" className="text-[9px] font-black text-primary uppercase tracking-[0.15em] hover:underline flex items-center gap-1 group">
                                            View All <svg className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                                        </Link>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                         {!canAccessAiFeatures ? (
                                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">AI feature</p>
                                                <p className="text-sm text-foreground font-semibold mt-2">Top Candidates is part of the premium AI discovery suite.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => openPlansModal(
                                                        "Unlock AI Candidate Discovery",
                                                        "Top Candidates and premium best-match discovery are available on the Elite employer plan with monthly and yearly billing."
                                                    )}
                                                    className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                                                >
                                                    View Plans
                                                </button>
                                            </div>
                                        ) : topCandidates.length === 0 ? (
                                            <div className="bg-muted/10 border-2 border-dashed border-border rounded-xl p-4 text-center">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Readying Top Talent...</p>
                                            </div>
                                        ) : (
                                            topCandidates.slice(0, 5).map((tc, i) => {
                                                const score = tc.interviewAttempts?.[0]?.score || 0;
                                                const days = (tc as any).available_in_days ?? 0;
                                                let urgencyColor = "text-blue-500";
                                                let urgencyLabel = "Available";
                                                if (days <= 3) { urgencyColor = "text-emerald-500"; urgencyLabel = "Available Now"; }
                                                else if (days <= 7) { urgencyColor = "text-amber-500"; urgencyLabel = "Interviewing"; }

                                                return (
                                                    <div key={tc.id} className="bg-card hover:bg-muted/40 border border-border rounded-lg p-2 flex flex-row items-center gap-2.5 transition-all group relative overflow-hidden min-h-[58px]">
                                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted border border-border overflow-hidden shrink-0 relative">
                                                            {tc.gender ? (
                                                                <img src={`/avatars/${tc.gender.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center font-black text-primary text-xs">{tc.name.charAt(0)}</div>
                                                            )}
                                                            <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-white text-[6px] font-black text-center py-px uppercase">#{i + 1}</div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline gap-2">
                                                                <h3 className="text-[11px] sm:text-xs font-black text-foreground truncate">{tc.name}</h3>
                                                                <span className="text-[8px] font-black text-primary uppercase">Score: {score}</span>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-muted-foreground opacity-60 truncate">{tc.current_job_title || "Developer"}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[7px] font-black uppercase ${urgencyColor}`}>{urgencyLabel}</span>
                                                                <span className="text-[7px] font-bold text-muted-foreground opacity-40 uppercase">AI Verified</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 px-0.5">
                                                            <WhatsAppButton
                                                                phone={tc.phone}
                                                                name={tc.name}
                                                                score={score}
                                                                skill={tc.skills?.[0]}
                                                                mobileFullWidth={false}
                                                            />
                                                            {tc.email && (
                                                                <a
                                                                    href={getGmailComposeUrl(tc.email)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={`Email ${tc.name}`}
                                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                </a>
                                                            )}
                                                            <Link href={`/candidate/${tc.id}`} className="h-8 w-8 flex items-center justify-center rounded-lg bg-foreground text-background hover:scale-105 transition-all shadow-md">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    {canAccessAiFeatures ? (
                                        <FreshMatchesWidget employerJobId={jobs[0]?.id} employerJobTitle={jobs[0]?.job_title} />
                                    ) : (
                                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 h-full">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.22em] mb-2">AI feature</p>
                                            <h3 className="text-base font-bold text-foreground mb-2">Fresh Matches AI Feed</h3>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                Premium fresh candidate matches are unlocked only when AI discovery is enabled on your employer subscription.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => openPlansModal(
                                                    "Unlock Fresh Matches AI",
                                                    "Fresh Matches and best-candidate AI discovery are available on the Elite employer plan. Yearly billing includes the admin-configured discount."
                                                )}
                                                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                                            >
                                                View Plans
                                            </button>
                                        </div>
                                    )}
                                </div>
                                </div>

                                 {/* Pipeline Overview removed from priority, moved below jobs if needed, or kept very minimal at bottom */}

                                <div className="mb-4 flex justify-between items-center sm:items-end">
                                    <h2 className="text-lg sm:text-[18px] font-semibold text-foreground tracking-tight">Active Jobs</h2>
                                    <div className="flex items-center gap-3">
                                        <div className="relative group">
                                            <select
                                                value={timeFilter}
                                                onChange={(e) => setTimeFilter(e.target.value)}
                                                className="bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer pr-8"
                                            >
                                                <option value="all">All Postings</option>
                                                <option value="today">Recently Posted</option>
                                                <option value="week">1 Week Ago</option>
                                                <option value="month">1 Month Ago</option>
                                                <option value="year">Year Ago</option>
                                            </select>
                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-50">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 max-w-[920px] mx-auto">
                                    {(() => {
                                        const filteredJobs = jobs.filter(job => {
                                            if (timeFilter === "all") return true;
                                            const createdAt = new Date(job.created_at);
                                            const now = new Date();
                                            const diffTime = Math.abs(now.getTime() - createdAt.getTime());
                                            const diffDays = diffTime / (1000 * 60 * 60 * 24);

                                            if (timeFilter === "today") return diffDays <= 1;
                                            if (timeFilter === "week") return diffDays <= 7;
                                            if (timeFilter === "month") return diffDays <= 30;
                                            if (timeFilter === "year") return diffDays <= 365;
                                            return true;
                                        });

                                        if (jobs.length === 0) {
                                            return (
                                                <div className="glass border border-border border-dashed rounded-xl p-6 text-center bg-muted">
                                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-foreground mb-2">No jobs posted yet</h3>
                                                    <p className="text-muted-foreground mb-6">Create your first job posting to start receiving applications.</p>
                                                    <Link href="/employer-dashboard/post-job" className="inline-flex bg-foreground text-background hover:opacity-80 font-bold py-2.5 px-6 rounded-xl transition-all items-center">
                                                        Post a Job
                                                    </Link>
                                                </div>
                                            );
                                        }

                                        if (filteredJobs.length === 0) {
                                            return (
                                                <div className="glass border border-border border-dashed rounded-xl p-10 text-center bg-muted/30">
                                                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <svg className="w-8 h-8 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                    </div>
                                                    <h3 className="text-md font-bold text-foreground mb-1">No jobs found</h3>
                                                    <p className="text-muted-foreground text-xs">No active postings match the selected time filter.</p>
                                                    <button onClick={() => setTimeFilter("all")} className="mt-4 text-xs font-bold text-primary uppercase tracking-widest hover:underline">Clear Filter</button>
                                                </div>
                                            );
                                        }

                                        return filteredJobs.map((job) => (
                                            <div key={job.id} className="glass rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">

                                                {/* Job Header */}
                                                <div className="p-3.5 sm:p-4 border-b border-border bg-card space-y-3">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <h3 className="text-sm sm:text-base font-semibold font-heading text-foreground tracking-tight">
                                                            <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors duration-300">{job.job_title}</Link>
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            {job.external_apply_url && (
                                                                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold uppercase tracking-wider">External</span>
                                                            )}
                                                            <span className={`text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-widest font-bold shrink-0 ${job.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : job.status === "PAUSED" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                                                                {job.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                                                        <span className="flex items-center"><svg className="w-3 h-3 mr-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> {job.city}</span>
                                                        <span className="flex items-center"><svg className="w-3 h-3 mr-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {job.currency} {job.salary_min.toLocaleString()} - {job.salary_min === 0 && job.salary_max === 0 ? "Not specified" : job.salary_max.toLocaleString()}</span>
                                                        <span className="flex items-center"><svg className="w-3 h-3 mr-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {new Date(job.created_at).toLocaleDateString()}</span>
                                                    </div>

                                                    <div className="flex gap-2 w-full">
                                                        <Link
                                                            href={`/employer-dashboard/post-job?edit=${job.id}`}
                                                            className="flex-1 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-foreground text-[11px] rounded-lg font-bold transition-all border border-white/5"
                                                        >
                                                            Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => handleToggleJobStatus(job.id, job.status)}
                                                            disabled={togglingJob === job.id}
                                                            className="flex-1 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-foreground text-[11px] rounded-lg font-bold transition-all disabled:opacity-50 border border-white/5"
                                                        >
                                                            {togglingJob === job.id ? "..." : job.status === 'ACTIVE' ? "Pause" : "Reopen"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteJob(job.id)}
                                                            disabled={deletingJob === job.id}
                                                            className="h-8 w-9 flex items-center justify-center bg-neutral-800/50 text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-white/5"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    </div>

                                                    <div className="pt-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] text-secondary font-bold uppercase tracking-widest opacity-60">Hiring Progress</span>
                                                            <span className="text-[11px] font-bold text-foreground">
                                                                {job.applications.filter(a => a.application_status === 'hired').length} / {job.openings} Hired
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                                                style={{ width: `${Math.min(100, (job.applications.filter(a => a.application_status === 'hired').length / job.openings) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pipeline Stats Row */}
                                                <div className="bg-muted border-b border-border px-3.5 py-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-muted/40 shadow-sm"></span>
                                                        Total: <span className="text-foreground ml-0.5">{job.applications.length}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"></span>
                                                        Interview: <span className="text-foreground ml-0.5">{job.applications.filter(a => a.application_status === 'interview').length}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></span>
                                                        Hired: <span className="text-foreground ml-0.5">{job.applications.filter(a => a.application_status === 'hired').length}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-muted px-3.5 sm:px-4 py-2.5 flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-muted-foreground">Applicants: {job.applications.length}</span>
                                                    <button
                                                        onClick={() => handleTabNavigation("applicants", job.id)}
                                                        className="text-background bg-foreground hover:opacity-80 transition-colors text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center shadow-sm"
                                                    >
                                                        Pipeline
                                                        <svg className="w-3 h-3 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </motion.div>
                        )}

                        {tab === "applicants" && (
                            <motion.div
                                key="applicants"
                                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.992 }}
                                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                <div className="w-full max-w-[1180px] 2xl:max-w-[1240px] mx-auto">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4 sm:gap-6">
                                        <div className="space-y-1">
                                            <h1 className="text-2xl sm:text-[28px] font-semibold text-foreground tracking-tight leading-tight">Applied <span className="text-primary">Candidates</span></h1>
                                            <p className="text-secondary text-xs sm:text-sm font-medium">Review applications and manage your talent pipeline stages.</p>
                                        </div>

                                        <div className="w-full sm:w-80 relative group">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-transform group-focus-within:scale-110">
                                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            </div>
                                            <select
                                                value={selectedJobIdForApplicants}
                                                onChange={(e) => setSelectedJobIdForApplicants(e.target.value)}
                                                className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-10 py-3.5 text-foreground font-semibold text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="all">All Active Postings</option>
                                                {jobs.map(j => (
                                                    <option key={j.id} value={j.id} className="font-bold">{j.job_title}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground/60">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const jobsToShow = selectedJobIdForApplicants === "all" ? jobs : jobs.filter(j => j.id === selectedJobIdForApplicants);
                                        const allApps = jobsToShow.flatMap(j => j.applications.map(app => ({ 
                                            ...app, 
                                            job: j,
                                            score_val: (app as any).latest_interview_score?.score || 0
                                        })));

                                        // Sort by score (Ranked Candidates First)
                                        allApps.sort((a, b) => b.score_val - a.score_val);

                                        if (allApps.length === 0) {
                                            return (
                                                <div className="glass border border-border rounded-xl p-6 text-center bg-muted shadow-sm">
                                                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
                                                        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                    </div>
                                                    <h4 className="text-foreground font-bold text-xl mb-2">No candidates found</h4>
                                                    <p className="text-muted-foreground text-sm">There are no applications matching the selected criteria.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="glass bg-muted border border-border rounded-xl overflow-x-auto shadow-sm">
                                                <div className="w-full">
                                                    <table className="w-full md:min-w-[1120px] text-left text-sm block md:table">
                                                        <thead className="hidden md:table-header-group text-xs text-muted-foreground uppercase font-semibold bg-muted border-b border-border tracking-wider">
                                                            <tr>
                                                                <th className="px-5 py-2.5 font-bold">Rank</th>
                                                                <th className="px-5 py-2.5 font-bold">Candidate</th>
                                                                <th className="px-5 py-2.5 font-bold">Applied Job</th>
                                                                <th className="px-5 py-2.5 font-bold text-center">AI Score</th>
                                                                <th className="px-5 py-2.5 font-bold text-center">Percentile</th>
                                                                <th className="px-5 py-2.5 font-bold text-center">Match</th>
                                                                <th className="px-5 py-2.5 font-bold text-center">Resume</th>
                                                                <th className="px-5 py-2.5 font-bold text-right">Stage</th>
                                                                <th className="px-5 py-2.5 font-bold text-center">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--border-default)] block md:table-row-group">
                                                            {allApps.map((app, index) => {
                                                                const rank = index + 1;
                                                                const total = allApps.length;
                                                                const percentile = Math.round(((total - rank + 0.5) / total) * 100);
                                                                const isStageLocked = isApplicationStageLocked(app.application_status);
                                                                
                                                                return (
                                                                <tr key={app.id} onClick={() => setSelectedCandidate(app)} className="hover:bg-[#FF7A00]/5 transition-colors duration-300 group cursor-pointer flex flex-col md:table-row border-b md:border-b-0 border-border p-3 sm:p-4 md:p-0">
                                                                    <td className="md:px-5 md:py-3 text-center hidden md:table-cell">
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition-all ${rank <= 3 ? "bg-[#FF7A00] text-white shadow-sm scale-110" : "bg-muted text-muted-foreground"}`}>
                                                                            {rank}
                                                                        </div>
                                                                    </td>
                                                                    <td className="md:px-6 md:py-3 flex flex-row items-center gap-2 sm:gap-3 mb-2 sm:mb-4 md:mb-0">
                                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground text-xs sm:text-sm overflow-hidden shrink-0 shadow-sm">
                                                                            {fixGoogleDriveUrl(app.candidate.avatar_url, 100) ? (
                                                                                <img src={fixGoogleDriveUrl(app.candidate.avatar_url, 100) || ""} alt="Avatar" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                                            ) : app.candidate.gender ? (
                                                                                <img src={`/avatars/${(app.candidate?.gender || 'male').toLowerCase()}.png`} alt="Avatar" className="w-full h-full object-cover bg-background" loading="lazy" decoding="async" />
                                                                            ) : (
                                                                                (app.applicant_name || app.candidate.name || '?').charAt(0).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-foreground group-hover:text-[#FF7A00] transition-colors duration-300 block leading-tight text-sm sm:text-[15px]">
                                                                                {app.applicant_name || app.candidate.name}
                                                                            </span>
                                                                            <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 block font-medium">{app.candidate.email}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">Applied Job</div>
                                                                        <div className="text-right md:text-left">
                                                                            <div className="text-foreground font-bold mb-0.5 text-xs sm:text-[13px]">{app.job.job_title}</div>
                                                                            <div className="text-muted-foreground text-[10px] sm:text-xs font-medium">{new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 text-center flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">AI Score</div>
                                                                        {(app as any).latest_interview_score ? (
                                                                            <div className="flex flex-col items-center">
                                                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center bg-primary/5 ${rank <= 3 ? "border-[#FF7A00]" : "border-primary/30"}`}>
                                                                                    <span className={`text-xs sm:text-sm font-semibold ${rank <= 3 ? "text-[#FF7A00]" : "text-primary"}`}>{(app as any).latest_interview_score.score}</span>
                                                                                </div>
                                                                                {rank <= 3 && (
                                                                                    <span className="text-[7px] sm:text-[8px] bg-[#FF7A00] text-white px-1.5 sm:px-2 py-0.5 rounded-full font-semibold uppercase mt-1 sm:mt-1.5 shadow-sm">Top Talent</span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] sm:text-[13px] font-medium text-muted-foreground/40 font-semibold uppercase italic tracking-tighter">Not Assessed</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 text-center flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">Percentile</div>
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={`text-xs sm:text-sm font-black ${percentile >= 90 ? "text-green-500" : percentile >= 75 ? "text-blue-500" : "text-muted-foreground"}`}>
                                                                                {percentile}%
                                                                            </span>
                                                                            <span className="text-[7px] uppercase font-bold text-muted-foreground tracking-tighter opacity-50">of applicants</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 text-center flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">Match Score</div>
                                                                        {(() => {
                                                                            let candidateSkills: string[] = [];
                                                                            if (app.candidate.skills) {
                                                                                try { candidateSkills = Array.isArray(app.candidate.skills) ? app.candidate.skills : JSON.parse(app.candidate.skills); } catch (e) { }
                                                                            }
                                                                            let reqSkills: string[] = [];
                                                                            if (app.job.required_skills) {
                                                                                try { reqSkills = Array.isArray(app.job.required_skills) ? app.job.required_skills : JSON.parse(app.job.required_skills); } catch (e) { }
                                                                            }

                                                                            let matchScore = 0;
                                                                            if (reqSkills.length > 0) {
                                                                                const matchCount = reqSkills.filter(req => candidateSkills.some(cand => cand.toLowerCase() === req.toLowerCase())).length;
                                                                                matchScore = Math.round((matchCount / reqSkills.length) * 100);
                                                                            } else {
                                                                                matchScore = 100; // No requirements = 100% match structurally or just N/A
                                                                            }

                                                                            let badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";
                                                                            if (matchScore >= 80) badgeColor = "bg-green-500/10 text-green-500 border-green-500/20";
                                                                            else if (matchScore >= 50) badgeColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";

                                                                            return (
                                                                                reqSkills.length > 0 ? (
                                                                                    <div className={`mx-auto inline-flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${badgeColor}`}>
                                                                                        {matchScore}%
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-[10px] sm:text-xs font-medium">N/A</span>
                                                                                )
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 text-center flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">Resume</div>
                                                                        {(() => {
                                                                            const tableResumeUrl = (app.resume_url && app.resume_url !== "No resume provided") 
                                                                                ? app.resume_url 
                                                                                : (app.candidate.resume_url && app.candidate.resume_url !== "No resume provided")
                                                                                    ? app.candidate.resume_url
                                                                                    : null;
                                                                            
                                                                            return tableResumeUrl ? (
                                                                                <a href={`/api/candidates/${app.candidate.id}/resume`} target="_blank" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted hover:bg-[#FF7A00] text-muted-foreground hover:text-white transition-colors duration-300 border border-border hover:border-transparent group/btn">
                                                                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-muted-foreground font-bold text-xs">-</span>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="md:px-6 md:py-4 text-right flex justify-between items-center md:table-cell border-t border-border pt-4 md:border-t-0 md:pt-4">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">Pipeline Stage</div>
                                                                        <div className="relative inline-block text-left w-32 sm:w-36">
                                                                            <select
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                value={app.application_status}
                                                                                onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                                                                disabled={updatingStatus === app.id || isStageLocked}
                                                                                className={`w-full min-w-[90px] sm:min-w-[110px] appearance-none border border-border/50 text-[11px] sm:text-[13px] font-medium px-2 py-1.5 sm:py-2 pr-6 rounded-lg font-bold transition-all disabled:opacity-50 outline-none cursor-pointer text-left ${
                                                                                    app.application_status === 'applied' ? 'bg-muted text-foreground' :
                                                                                        app.application_status === 'shortlisted' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                                                                            app.application_status === 'interview' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                                                                                app.application_status === 'hired' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                                                                                                    'bg-red-500/10 border-red-500/30 text-red-500'
                                                                                    }`}
                                                                            >
                                                                                <option value="applied" className="bg-background text-foreground">Applied</option>
                                                                                <option value="shortlisted" className="bg-background text-yellow-500">Shortlisted</option>
                                                                                <option value="interview" className="bg-background text-blue-500">Interview</option>
                                                                                <option value="hired" className="bg-background text-green-500">Hired</option>
                                                                                <option value="rejected" className="bg-background text-red-500">Rejected</option>
                                                                            </select>
                                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-current opacity-50">
                                                                                <svg className="fill-current h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="md:px-6 md:py-3 text-center flex flex-col md:table-cell py-1 sm:py-2 mt-1 sm:mt-2 border-t border-border pt-2 sm:pt-4 md:mt-0 md:border-t-0 md:pt-4">
                                                                        <div className="md:hidden text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 sm:mb-2 text-left">Recruiter Actions</div>
                                                                        <div className="flex justify-start md:justify-center gap-2 w-full">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'shortlisted'); }}
                                                                                disabled={isStageLocked || updatingStatus === app.id}
                                                                                title="Shortlist Candidate"
                                                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${app.application_status === 'shortlisted' ? "bg-yellow-500 text-white border-transparent" : "bg-yellow-500/10 hover:bg-yellow-500 text-yellow-600 hover:text-white border-yellow-500/20 hover:border-transparent"}`}
                                                                            >
                                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6.15 4.47 2.35 7.33-6.2-4.48-6.2 4.48 2.35-7.33-6.15-4.47h7.6z" /></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); if (!isStageLocked) setInterviewModal({ open: true, app }); }}
                                                                                disabled={isStageLocked || updatingStatus === app.id}
                                                                                title="Schedule Interview"
                                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white transition-colors duration-300 border border-blue-500/20 hover:border-transparent"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                            </button>
                                                                            <WhatsAppButton
                                                                                phone={app.phone || "0000000000"}
                                                                                name={app.applicant_name || app.candidate.name}
                                                                                score={(app as any).latest_interview_score?.score || 80}
                                                                                skill={app.candidate.skills?.[0] || "Assessment"}
                                                                                jobTitle={app.job.job_title}
                                                                                jobId={app.job.id}
                                                                                mobileFullWidth={false}
                                                                            />
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'rejected'); }}
                                                                                disabled={isStageLocked || updatingStatus === app.id}
                                                                                title="Reject Candidate"
                                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors duration-300 border border-red-500/20 hover:border-transparent"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        )}

                        {tab === "settings" && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.992 }}
                                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="w-full max-w-[1040px] mx-auto">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-1 sm:mb-2 tracking-tight">Company Profile</h1>
                                    <p className="text-muted-foreground mb-6 sm:mb-10 text-[11px] sm:text-sm">Update your company details to attract top talent. This information is publicly visible on your employer page.</p>

                                    {saveMsg && (
                                        <div className={`mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium border flex items-center ${saveMsg.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={saveMsg.type === "success" ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}></path></svg>
                                            {saveMsg.text}
                                        </div>
                                    )}

                                    <div className="glass bg-muted border border-border rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 space-y-6 sm:space-y-8">
                                        {/* Logo Upload Row */}
                                        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-center pb-6 sm:pb-8 border-b border-border">
                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0 shadow-inner">
                                                {companyLogo ? (
                                                    <img src={companyLogo} alt="Preview" className="w-full h-full object-contain p-2" loading="lazy" decoding="async" />
                                                ) : (
                                                    <svg className="w-8 h-8 sm:w-12 sm:h-12 text-foreground/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-4-4v4h2v-4h-2z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-foreground font-bold mb-1">Company Logo</h3>
                                                <p className="text-sm text-muted-foreground mb-4">Upload your high-resolution company logo. Recommended size is 256x256px.</p>
                                                <button
                                                    onClick={() => logoInputRef.current?.click()}
                                                    disabled={uploadingLogo}
                                                    className="bg-muted hover:bg-border text-foreground border border-border font-medium py-2 px-5 rounded-lg transition-colors duration-300 text-sm inline-flex items-center disabled:opacity-50"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                                    {uploadingLogo ? "Uploading..." : "Upload New Image"}
                                                </button>
                                                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
                                            </div>
                                        </div>

                                        {/* Form Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">Company Name *</label>
                                                <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" placeholder="Enter full company name" />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-muted-foreground mb-2">Company Overview</label>
                                                <textarea value={companyBio} onChange={e => setCompanyBio(e.target.value)} rows={5} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y" placeholder="Summarize your company's mission, culture, and achievements..."></textarea>
                                                <p className="text-xs text-muted-foreground mt-2 text-right">{companyBio.length} characters</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-muted-foreground mb-2">Company Size</label>
                                                <div className="relative">
                                                    <CustomSelect
                                                        value={companySize}
                                                        onChange={setCompanySize}
                                                        placeholder="Select organizational size"
                                                        options={[
                                                            { value: "1-10", label: "1-10 Employees" },
                                                            { value: "11-50", label: "11-50 Employees" },
                                                            { value: "51-200", label: "51-200 Employees" },
                                                            { value: "201-500", label: "201-500 Employees" },
                                                            { value: "500+", label: "500+ Employees" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-muted-foreground mb-2">Primary Industry</label>
                                                <div className="relative">
                                                    <CustomSelect
                                                        value={companyIndustry}
                                                        onChange={(val) => {
                                                            setCompanyIndustry(val);
                                                            setCompanySubIndustry(""); // Reset sub-industry when primary changes
                                                        }}
                                                        placeholder="Select primary sector"
                                                        options={[
                                                            { value: "Technology", label: "Technology" },
                                                            { value: "IT Services", label: "IT Services" },
                                                            { value: "Finance", label: "Finance" },
                                                            { value: "Healthcare", label: "Healthcare" },
                                                            { value: "Education", label: "Education" },
                                                            { value: "Manufacturing", label: "Manufacturing" },
                                                            { value: "Retail", label: "Retail" },
                                                            { value: "Other", label: "Other" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            {companyIndustry && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="block text-sm font-bold text-muted-foreground mb-2">Sub-Industry</label>
                                                    <div className="relative">
                                                        <CustomSelect
                                                            value={companySubIndustry}
                                                            onChange={setCompanySubIndustry}
                                                            placeholder="Select specific niche"
                                                            options={
                                                                companyIndustry === "Technology" ? [
                                                                    { value: "Software Development", label: "Software Development" },
                                                                    { value: "SaaS", label: "SaaS" },
                                                                    { value: "Cybersecurity", label: "Cybersecurity" },
                                                                    { value: "AI & ML", label: "AI & Machine Learning" },
                                                                    { value: "Blockchain", label: "Blockchain" },
                                                                ] : companyIndustry === "IT Services" ? [
                                                                    { value: "Managed Services", label: "Managed IT Services" },
                                                                    { value: "Cloud Computing", label: "Cloud Computing" },
                                                                    { value: "Consulting", label: "IT Consulting" },
                                                                    { value: "Infrastructure", label: "IT Infrastructure" },
                                                                    { value: "Data Center", label: "Data Center Operations" },
                                                                ] : companyIndustry === "Finance" ? [
                                                                    { value: "Banking", label: "Banking" },
                                                                    { value: "Fintech", label: "Fintech" },
                                                                    { value: "Insurance", label: "Insurance" },
                                                                    { value: "Investment", label: "Investment Management" },
                                                                    { value: "Crypto", label: "Cryptocurrency" },
                                                                ] : companyIndustry === "Healthcare" ? [
                                                                    { value: "Hospital", label: "Hospitals & Clinics" },
                                                                    { value: "Pharma", label: "Pharmaceuticals" },
                                                                    { value: "Biotech", label: "Biotechnology" },
                                                                    { value: "HealthTech", label: "Health Technology" },
                                                                    { value: "Medical Device", label: "Medical Devices" },
                                                                ] : [
                                                                    { value: "General", label: "General" },
                                                                    { value: "Consulting", label: "Consulting" },
                                                                    { value: "Operations", label: "Operations" },
                                                                    { value: "Services", label: "Professional Services" },
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                                                <h3 className="text-foreground font-bold mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                    Headquarters Location
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Country</label>
                                                        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. USA" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">State / Province</label>
                                                        <input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. California" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">City</label>
                                                        <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. San Francisco" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-muted-foreground mb-2">Corporate Website</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                                    </div>
                                                    <input value={companyWeb} onChange={e => setCompanyWeb(e.target.value)} placeholder="https://www.company.com" className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6 rounded-[26px] border border-border bg-card p-5 shadow-sm sm:p-6">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Subscription</p>
                                                <h3 className="mt-1 text-xl font-black text-foreground">Manage Employer Plan</h3>
                                                <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
                                                    Review your current plan, billing cycle, renewal status, or upgrade to unlock more sourcing and AI hiring tools.
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                                <div className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${
                                                    subscriptionSnapshot?.activeSubscription
                                                        ? subscriptionSnapshot.activeSubscription.cancelAtPeriodEnd
                                                            ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                                                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                                        : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                                                }`}>
                                                    {subscriptionSnapshot?.activePlan
                                                        ? `${subscriptionSnapshot.activePlan.name} ${subscriptionSnapshot.activeSubscription?.billingCycle === "yearly" ? "Yearly" : "Monthly"}`
                                                        : "No Active Plan"}
                                                </div>
                                                <Link
                                                    href="/employer-dashboard/subscription"
                                                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-black transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                                                >
                                                    Open Subscription Page
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                                        <Link href={`/company/${profile?.id}`} className="bg-muted hover:bg-border border border-border text-foreground text-sm font-medium py-2 sm:py-2.5 px-4 rounded-xl transition-colors duration-300 flex items-center justify-center shadow-sm">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            View Public Profile
                                        </Link>
                                        <button onClick={handleSaveProfile} disabled={saving} className="bg-[#FF7A00] hover:bg-amber-600 text-white text-sm font-medium py-2 sm:py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-[#FF7A00]/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                                            {saving ? (
                                                <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Updating...</>
                                            ) : (
                                                "Save Configuration"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {tab === "talent" && (
                            <motion.div
                                key="talent"
                                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.992 }}
                                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <EmployerTalentPanel embedded />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

                {/* Candidate Slide-over Sidebar */}
                {
                    selectedCandidate && (
                        <div className="fixed inset-0 z-50 overflow-hidden">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCandidate(null)}></div>
                            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <div className="w-screen max-w-md transform transition-all duration-300 ease-in-out border-l border-border glass bg-background shadow-md flex flex-col h-full shadow-[0_0_40px_rgba(0,0,0,0.1)] outline-none">
                                    {/* Header */}
                                    <div className="bg-muted border-b border-border px-4 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shrink-0">
                                        <h2 className="text-base sm:text-lg font-semibold font-heading text-foreground tracking-tight">Candidate Profile</h2>
                                        <button
                                            onClick={() => setSelectedCandidate(null)}
                                            className="text-muted-foreground hover:text-foreground bg-muted border border-border hover:border-foreground rounded-full p-1.5 sm:p-2 transition-all focus:outline-none"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 scrollbar-hide">
                                        <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted border-[1.5px] border-border flex items-center justify-center font-bold text-muted-foreground text-xl sm:text-2xl overflow-hidden shrink-0 shadow-sm">
                                                {fixGoogleDriveUrl(selectedCandidate.candidate.avatar_url, 100) ? (
                                                    <img src={fixGoogleDriveUrl(selectedCandidate.candidate.avatar_url, 100)!} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                ) : selectedCandidate.candidate.gender ? (
                                                    <img src={`/avatars/${(selectedCandidate.candidate?.gender || 'male').toLowerCase()}.png`} alt="Avatar" className="w-full h-full object-cover bg-[#fdf2e9]" loading="lazy" decoding="async" />
                                                ) : (
                                                    (selectedCandidate.applicant_name || selectedCandidate.candidate.name || '?').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-1.5 leading-tight">{selectedCandidate.applicant_name || selectedCandidate.candidate.name}</h3>
                                                <p className="text-[#FF7A00] text-xs sm:text-sm font-bold uppercase tracking-widest mb-2 truncate max-w-[200px]">
                                                    {selectedCandidate.candidate.headline || "Ambitious Candidate"}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center text-[10px] sm:text-[12px] font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                                                        Stage: <span className="uppercase ml-1 tracking-wider">{selectedCandidate.application_status}</span>
                                                    </div>
                                                    <a
                                                        href={getGmailComposeUrl(selectedCandidate.candidate.email)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                                                        title={`Email ${selectedCandidate.candidate.email}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Overview Section */}
                                            <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#FF7A00] rounded-l-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                                <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 sm:mb-5 flex items-center">
                                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    Professional Narrative
                                                </h4>
                                                <div className="space-y-4">
                                                    {selectedCandidate.candidate.bio ? (
                                                        <p className="text-muted-foreground text-[13px] leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-500 whitespace-pre-wrap">
                                                            {selectedCandidate.candidate.bio}
                                                        </p>
                                                    ) : (
                                                        <p className="text-muted-foreground/60 text-[13px] italic">No professional trajectory provided.</p>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50 mt-4">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phone</p>
                                                            <p className="text-foreground text-xs font-semibold">{selectedCandidate.phone || selectedCandidate.candidate.phone || "Not provided"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
                                                            <p className="text-foreground text-xs font-semibold truncate">
                                                                {[selectedCandidate.candidate.city, selectedCandidate.candidate.state, selectedCandidate.candidate.country].filter(Boolean).join(', ') || selectedCandidate.address || "Global Candidate"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Recommended Scores Section */}
                                            {selectedCandidate.candidate.interviewAttempts && selectedCandidate.candidate.interviewAttempts.length > 0 && (
                                                <div className="glass bg-slate-900 border border-[#FF7A00]/30 rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A00]/10 blur-2xl rounded-full"></div>
                                                    <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-[#FF7A00]/80 uppercase mb-5 flex items-center">
                                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        AI RECOMMENDATION
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {selectedCandidate.candidate.interviewAttempts.slice(0, 1).map((attempt: any, i: number) => (
                                                            <div key={i} className="space-y-3">
                                                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold text-xs mb-1 truncate">{attempt.role_tested_for || "Technical Assessment"}</p>
                                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                                            {new Date(attempt.created_at).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-[#FF7A00] text-white h-9 w-12 rounded-lg flex flex-col items-center justify-center font-black shadow-lg shadow-[#FF7A00]/20">
                                                                        <span className="text-lg leading-none">{attempt.score}</span>
                                                                        <span className="text-[8px] opacity-60">/10</span>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Comm.</p>
                                                                        <p className="text-xs font-bold text-foreground">{attempt.communication_score || '4.2'}/5</p>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Technical</p>
                                                                        <p className="text-xs font-bold text-foreground">{attempt.technical_score || '4.5'}/5</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Social Links Section */}
                                            {selectedCandidate.candidate.social_links && Object.values(selectedCandidate.candidate.social_links).some(v => !!v) && (
                                                <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm">
                                                    <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center">
                                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                        Professional Channels
                                                    </h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {Object.entries(selectedCandidate.candidate.social_links).map(([key, value]: [string, any]) => {
                                                            if (!value) return null;
                                                            return (
                                                                <a key={key} href={value.toString().startsWith('http') ? value.toString() : `https://${value.toString()}`} target="_blank" className="px-3 py-1.5 rounded-lg bg-background border border-border flex items-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm group/social">
                                                                    <span className="text-[10px] font-black uppercase text-xs">{key}</span>
                                                                    <svg className="w-3 h-3 ml-1.5 opacity-0 group-hover/social:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Skills Section */}

                                            {/* Skills Section */}
                                            {(() => {
                                                const rawSkills = selectedCandidate.candidate.skills;
                                                const skills = Array.isArray(rawSkills) ? rawSkills : (typeof rawSkills === 'string' ? JSON.parse(rawSkills) : []);
                                                if (!Array.isArray(skills) || skills.length === 0) return null;
                                                
                                                return (
                                                    <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm">
                                                        <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center">
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
                                                            Skill Arsenal
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {skills.map((skill: string, i: number) => (
                                                                <span key={i} className="bg-background text-foreground border border-border px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Experience Section */}
                                            {(() => {
                                                const rawExp = selectedCandidate.candidate.experience;
                                                const experience = Array.isArray(rawExp) ? rawExp : (typeof rawExp === 'string' ? JSON.parse(rawExp) : []);
                                                if (!Array.isArray(experience) || experience.length === 0) return null;

                                                return (
                                                    <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm">
                                                        <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center">
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                            Career History
                                                        </h4>
                                                        <div className="space-y-5">
                                                            {experience.slice(0, 1).map((exp: any, i: number) => (
                                                                <div key={i} className="relative pl-5 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-[1.5px] before:bg-border last:before:hidden">
                                                                    <div className="absolute left-[-2.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]"></div>
                                                                    <p className="text-xs font-bold text-foreground leading-none mb-1">{exp.role || exp.title}</p>
                                                                    <p className="text-[11px] font-semibold text-[#FF7A00] mb-1">{exp.company}</p>
                                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                                        {exp.duration || `${exp.startYear || ""} — ${exp.endYear || "Present"}`}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                            {experience.length > 1 && (
                                                                <p className="text-[10px] text-center text-muted-foreground font-bold uppercase pt-2">+ {experience.length - 1} more professional entries</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Education Section */}
                                            {(() => {
                                                const rawEdu = selectedCandidate.candidate.education;
                                                const education = Array.isArray(rawEdu) ? rawEdu : (typeof rawEdu === 'string' ? JSON.parse(rawEdu) : []);
                                                if (!Array.isArray(education) || education.length === 0) return null;

                                                return (
                                                    <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm">
                                                        <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center">
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5v4m0 0v-4m0 4h-4m4 0h4" /></svg>
                                                            Academic Foundation
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {education.slice(0, 1).map((edu: any, i: number) => (
                                                                <div key={i} className="flex gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                                                                        <span className="text-[10px] font-black text-muted-foreground">{edu.graduationYear?.toString().slice(-2) || "ED"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-foreground leading-tight mb-0.5">{edu.degree}</p>
                                                                        <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{edu.school}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Timeline Section */}
                                            <div className="glass bg-muted rounded-xl p-4 sm:p-5 border border-border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981] rounded-l-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                                <h4 className="text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 sm:mb-5 flex items-center"><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Application Timeline</h4>
                                                
                                                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[15px] before:w-0.5 before:bg-border before:h-full">
                                                    <div className="relative flex items-center gap-4 group is-active">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] shrink-0 z-10 shadow-sm">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-foreground font-bold text-xs sm:text-sm">Applied for Job</span>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                                                {new Date(selectedCandidate.applied_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="bg-muted border-t border-border px-4 sm:px-5 py-2 sm:py-2.5 shrink-0 z-10 box-border flex flex-col gap-2.5 sm:gap-3">
                                        {(() => {
                                            const effectiveResumeUrl = (selectedCandidate.resume_url && selectedCandidate.resume_url !== "No resume provided") 
                                                ? selectedCandidate.resume_url 
                                                : (selectedCandidate.candidate.resume_url && selectedCandidate.candidate.resume_url !== "No resume provided")
                                                    ? selectedCandidate.candidate.resume_url
                                                    : null;

                                            return effectiveResumeUrl ? (
                                                <a
                                                    href={`/api/candidates/${selectedCandidate.candidate.id}/resume`}
                                                    target="_blank"
                                                    className="w-full flex items-center justify-center bg-[#FF7A00] text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl transition-all hover:bg-[#FF7A00]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] shadow-sm group text-xs sm:text-base"
                                                >
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-y-0.5 group-hover:scale-105 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    Open Resume Document
                                                </a>
                                            ) : (
                                                <button disabled className="w-full flex items-center justify-center py-3 sm:py-3.5 px-4 rounded-xl border border-dashed border-border bg-muted text-muted-foreground font-medium text-[11px] sm:text-sm cursor-not-allowed">
                                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    No resume attached
                                                </button>
                                            );
                                        })()}
                                        <Link
                                            href={`/candidate/${selectedCandidate.candidate.id}`}
                                            className="w-full flex items-center justify-center bg-muted text-foreground font-bold py-2.5 sm:py-3 px-4 rounded-xl transition-all hover:bg-border border border-border shadow-sm text-[11px] sm:text-sm"
                                        >
                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            View Full Profile
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bottom Tab Bar / Sidebar */}
                <EmployerSidebarNav
                    activeItem={tab}
                    onSelect={(item) => {
                        if (item === "post") {
                            navigateToEmployerRoute("/employer-dashboard/post-job");
                            return;
                        }

                        if (item === "talent") {
                            handleTabNavigation("talent");
                            return;
                        }

                        handleTabNavigation(item);
                    }}
                />

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

            {/* Schedule Interview Modal */}
            {
                interviewModal.app && (
                    <ScheduleInterviewModal
                        isOpen={interviewModal.open}
                        onClose={() => setInterviewModal({ open: false, app: null })}
                        candidateName={interviewModal.app.applicant_name || interviewModal.app.candidate.name}
                        candidateId={interviewModal.app.candidate.id}
                        jobId={interviewModal.app.job.id}
                        jobTitle={interviewModal.app.job.job_title}
                        applicationId={interviewModal.app.id}
                        onScheduled={() => {
                            setJobs(prevJobs => prevJobs.map(job => ({
                                ...job,
                                applications: job.applications.map(app =>
                                    app.id === interviewModal.app.id ? { ...app, application_status: "interview" } : app
                                )
                            })));
                        }}
                    />
                )
            }
        </div>
    );
}
