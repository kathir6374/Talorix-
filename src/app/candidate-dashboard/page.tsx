"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LocationSelector, LocationSearchBox } from "@/components/LocationDropdown";
import { UpcomingInterviews } from "@/components/candidate/UpcomingInterviews";
import { CandidateBottomNav } from "@/components/CandidateBottomNav";
import CandidateJobsPanel from "@/components/candidate/CandidateJobsPanel";
import { getPendingJobApplication, getPendingJobApplicationHref } from "@/lib/pending-job-application";

interface Profile {
    id: string;
    name: string;
    email: string;
    role: string;
    headline: string | null;
    bio: string | null;
    phone: string | null;
    avatar_url: string | null;
    gender: string | null;
    skills: string[] | null;
    experience: any[] | null;
    education: any[] | null;
    social_links: any | null;
    open_to_work: boolean;
    resume_url: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    current_job_title: string | null;
    current_company: string | null;
    total_experience: string | null;
    certifications: any[] | null;
    projects: any[] | null;
    portfolio_links: string[] | null;
    expected_salary: string | null;
    preferred_location: string | null;
    ai_rank?: number;
    ai_percentile?: number;
    ai_confidence_score: number | null;
    ai_concept_coverage: number | null;
    availability_status: string | null;
    available_in_days: number | null;
    profile_views: number;
}

interface Application {
    id: string;
    applied_at: string;
    application_status: string;
    resume_url: string | null;
    pendingAttempts: number;
    activeInterview?: {
        id: string;
        scheduled_time: string;
        meeting_link: string;
        interview_type: string;
        status: string;
    } | null;
    job: {
        id: string;
        job_title: string;
        company_name: string;
        posted_by: string;
        employer?: {
            company_logo_url?: string;
            avatar_url?: string;
        };
    };
}

interface SavedJob {
    id: string;
    job_id: string;
    job: {
        id: string;
        job_title: string;
        company_name: string;
        city: string;
        state: string;
        country: string;
        posted_by: string;
        employer?: {
            company_logo_url?: string;
            avatar_url?: string;
        };
    };
}

interface RecommendedJob {
    id: string;
    job_title: string;
    company_name: string;
    job_type: string;
    ai_match_score?: number;
    ai_reason?: string;
}

type Tab = "overview" | "jobs" | "profile" | "saved" | "applications";
const RECENT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_STORAGE_KEY = "talorix_candidate_recent_activity";

interface RecentActivityEntry {
    status: string;
    timestamp: number;
}

export default function CandidateDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#FF7A00] border-t-transparent rounded-full"></div></div>}>
            <CandidateDashboardContent />
        </Suspense>
    );
}

function CandidateDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
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
    const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "overview");

    const handleLogout = async () => {
        try {
            // Client-side cleanup for immediate UI feedback
            document.cookie = "is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            
            // Call the correct auth logout endpoint
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Hard reload clears all internal React/memory state
            window.location.href = "/login";
        }
    };

    useEffect(() => {
        const t = searchParams.get("tab") as Tab;
        if (t && (t === "overview" || t === "jobs" || t === "profile" || t === "saved" || t === "applications")) {
            setTab(t);
        }
    }, [searchParams]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [recentActivityEntries, setRecentActivityEntries] = useState<Record<string, RecentActivityEntry>>({});
    const [activityNow, setActivityNow] = useState(() => Date.now());
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);

    // Profile edit state
    const [editName, setEditName] = useState("");
    const [editHeadline, setEditHeadline] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editGender, setEditGender] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editState, setEditState] = useState("");
    const [editCountry, setEditCountry] = useState("");
    const [editJobTitle, setEditJobTitle] = useState("");
    const [editCompany, setEditCompany] = useState("");
    const [editExperienceTotal, setEditExperienceTotal] = useState("");

    // New fields
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [experience, setExperience] = useState<any[]>([]);
    const [education, setEducation] = useState<any[]>([]);
    const [socialLinks, setSocialLinks] = useState({ linkedin: "", github: "", portfolio: "" });
    const [openToWork, setOpenToWork] = useState(true);
    // Extended fields
    const [certifications, setCertifications] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
    const [newPortfolioLink, setNewPortfolioLink] = useState("");
    const [expectedSalary, setExpectedSalary] = useState("");
    const [preferredLocation, setPreferredLocation] = useState("");

    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // New feature: Recommend Yourself
    const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
    const [recommendRole, setRecommendRole] = useState("");
    const [recommendAttemptsLeft, setRecommendAttemptsLeft] = useState(0);
    const candidateJobsHref = "/candidate-dashboard?tab=jobs";

    const syncRecentActivityEntries = (apps: Application[]) => {
        if (typeof window === "undefined") return {};

        const now = Date.now();
        let storedEntries: Record<string, RecentActivityEntry> = {};

        try {
            const rawEntries = window.localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY);
            if (rawEntries) {
                storedEntries = JSON.parse(rawEntries) as Record<string, RecentActivityEntry>;
            }
        } catch (error) {
            console.error("Failed to read recent activity cache:", error);
        }

        const nextEntries: Record<string, RecentActivityEntry> = {};

        apps.forEach((app) => {
            const storedEntry = storedEntries[app.id];
            const appliedAt = new Date(app.applied_at).getTime();
            const fallbackTimestamp = Number.isFinite(appliedAt) ? appliedAt : now;
            const nextEntry = !storedEntry
                ? { status: app.application_status, timestamp: fallbackTimestamp }
                : storedEntry.status !== app.application_status
                    ? { status: app.application_status, timestamp: now }
                    : storedEntry;

            if (now - nextEntry.timestamp < RECENT_ACTIVITY_WINDOW_MS) {
                nextEntries[app.id] = nextEntry;
            }
        });

        try {
            window.localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify(nextEntries));
        } catch (error) {
            console.error("Failed to update recent activity cache:", error);
        }

        return nextEntries;
    };

    const recentActivityApplications = applications.filter((app) => {
        const timestamp = recentActivityEntries[app.id]?.timestamp ?? new Date(app.applied_at).getTime();
        return Number.isFinite(timestamp) && activityNow - timestamp < RECENT_ACTIVITY_WINDOW_MS;
    });

    const recentActivityPreview = recentActivityApplications.slice(0, 5);

    const getVisibleApplicationInterview = (app: Application) => {
        if (!app.activeInterview?.meeting_link) return null;

        const scheduledAt = new Date(app.activeInterview.scheduled_time).getTime();
        if (!Number.isFinite(scheduledAt) || scheduledAt < activityNow) return null;

        return app.activeInterview;
    };

    const getInterviewAccessHref = (interview: NonNullable<Application["activeInterview"]>) => {
        if (interview.interview_type === "Phone") {
            return `tel:${interview.meeting_link.replace(/[^\d+]/g, "")}`;
        }

        if (interview.interview_type === "Onsite") {
            return interview.meeting_link.startsWith("http")
                ? interview.meeting_link
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interview.meeting_link)}`;
        }

        return interview.meeting_link.startsWith("http")
            ? interview.meeting_link
            : `https://${interview.meeting_link}`;
    };

    const getInterviewAccessLabel = (interviewType: string) => {
        if (interviewType === "Phone") return "Call";
        if (interviewType === "Onsite") return "Map";
        return "Join";
    };

    useEffect(() => {
        const timer = window.setInterval(() => setActivityNow(Date.now()), 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        async function init() {
            const profileRes = await fetch("/api/profile");
            if (!profileRes.ok) { router.push("/login"); return; }
            const profileData = await profileRes.json();
            const user: Profile = profileData.user;
            if (user.role !== "candidate") { router.push("/login"); return; }

            const pendingJobApplication = getPendingJobApplication();
            if (pendingJobApplication) {
                router.replace(getPendingJobApplicationHref(pendingJobApplication.jobId));
                return;
            }

            setProfile(user);
            setEditName(user.name || "");
            setEditHeadline(user.headline || "");
            setEditBio(user.bio || "");
            setEditPhone(user.phone || "");
            setEditGender(user.gender || "");
            setEditCity(user.city || "");
            setEditState(user.state || "");
            setEditCountry(user.country || "");
            setEditJobTitle(user.current_job_title || "");
            setEditCompany(user.current_company || "");
            setEditExperienceTotal(user.total_experience || "");

            // Handle JSON fields
            setSkills(Array.isArray(user.skills) ? user.skills : []);
            setExperience(Array.isArray(user.experience) ? user.experience : []);
            setEducation(Array.isArray(user.education) ? user.education : []);
            setSocialLinks(user.social_links || { linkedin: "", github: "", portfolio: "" });
            setOpenToWork(user.open_to_work);
            setCertifications(Array.isArray(user.certifications) ? user.certifications : []);
            setProjects(Array.isArray(user.projects) ? user.projects : []);
            setPortfolioLinks(Array.isArray(user.portfolio_links) ? user.portfolio_links : []);
            setExpectedSalary(user.expected_salary || "");
            setPreferredLocation(user.preferred_location || "");

            const recommendationsPromise = fetchRecommendations();
            const [appsRes, savedRes] = await Promise.all([
                fetch("/api/applications"),
                fetch("/api/bookmarks"),
            ]);

            if (appsRes.ok) {
                const appsData = await appsRes.json();
                const fetchedApplications = appsData.applications || [];
                setApplications(fetchedApplications);
                setRecentActivityEntries(syncRecentActivityEntries(fetchedApplications));
                setRecommendAttemptsLeft(appsData.recommendAttemptsLeft || 0);
            }

            if (savedRes.ok) {
                const savedData = await savedRes.json();
                setSavedJobs(savedData.bookmarks || []);
            }

            setLoading(false);

            void recommendationsPromise;
        }
        init();
    }, [router]);

    async function fetchRecommendations() {
        setLoadingRecommendations(true);
        try {
            const res = await fetch("/api/jobs/recommended?limit=3");
            if (res.ok) {
                const data = await res.json();
                setRecommendedJobs(data.jobs || []);
            } else {
                setRecommendedJobs([]);
            }
        } catch (err) {
            console.error("Failed to fetch recommendations", err);
            setRecommendedJobs([]);
        } finally {
            setLoadingRecommendations(false);
        }
    }

    const handleDeleteResume = async () => {
        if (!confirm("Are you sure you want to delete your resume?")) return;
        setUploadingResume(true);
        try {
            const res = await fetch("/api/upload/resume", { method: "DELETE" });
            if (res.ok) {
                setProfile(prev => prev ? { ...prev, resume_url: null } : null);
                setSaveMsg({ type: "success", text: "Resume deleted successfully." });
                void fetchRecommendations();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploadingResume(false);
        }
    };

    const handleRemoveBookmark = async (jobId: string) => {
        try {
            const res = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });
            if (res.ok) {
                setSavedJobs(savedJobs.filter(sj => sj.job_id !== jobId));
            }
        } catch (err) { console.error(err); }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingResume(true);
        setSaveMsg(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/resume", { // Using the existing resume upload endpoint
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                // Update profile display immediately
                setProfile(prev => prev ? { ...prev, resume_url: data.url } : prev);

                // Also trigger a background PATCH to ensure the user model is fully synchronized
                await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resume_url: data.url })
                });

                setSaveMsg({ type: "success", text: "Resume uploaded successfully!" });
                void fetchRecommendations();
            } else {
                setSaveMsg({ type: "error", text: data.error || "Resume upload failed." });
            }
        } catch (err: any) {
            console.error("Upload debugging:", err);
            setSaveMsg({ type: "error", text: `Network error: ${err.message || "Please check connection"}` });
        } finally {
            setUploadingResume(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        setSaveMsg(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/avatar", {
                method: "POST",
                body: formData,
            });
            const data: { url?: string; error?: string; details?: string } = await res.json().catch(() => ({}));

            const avatarUrl = data.url;
            if (res.ok && avatarUrl) {
                setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
                setSaveMsg({ type: "success", text: "Profile image uploaded successfully." });
            } else {
                setSaveMsg({ type: "error", text: data.error || data.details || "Profile image upload failed." });
            }
        } catch (err: unknown) {
            console.error("Avatar upload error:", err);
            setSaveMsg({ type: "error", text: `Network error: ${err instanceof Error ? err.message : "Please check connection"}` });
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };

    const handleDeleteAvatar = async () => {
        if (!confirm("Are you sure you want to remove your profile image?")) return;

        setUploadingAvatar(true);
        setSaveMsg(null);

        try {
            const res = await fetch("/api/upload/avatar", { method: "DELETE" });
            const data: { error?: string; details?: string } = await res.json().catch(() => ({}));

            if (res.ok) {
                setProfile(prev => prev ? { ...prev, avatar_url: null } : prev);
                setSaveMsg({ type: "success", text: "Profile image removed successfully." });
            } else {
                setSaveMsg({ type: "error", text: data.error || data.details || "Profile image removal failed." });
            }
        } catch (err: unknown) {
            console.error("Avatar delete error:", err);
            setSaveMsg({ type: "error", text: `Network error: ${err instanceof Error ? err.message : "Please check connection"}` });
        } finally {
            setUploadingAvatar(false);
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
                    name: editName,
                    headline: editHeadline,
                    bio: editBio,
                    phone: editPhone,
                    gender: editGender,
                    skills,
                    experience: experience.map(e => ({
                        ...e,
                        duration: (e.startYear !== undefined || e.endYear !== undefined) ? `${e.startYear || ""} — ${e.endYear || ""}` : e.duration
                    })),
                    education: education.map(e => ({
                        ...e,
                        duration: (e.startYear !== undefined || e.endYear !== undefined) ? `${e.startYear || ""} — ${e.endYear || ""}` : e.duration
                    })),
                    social_links: socialLinks,
                    open_to_work: openToWork,
                    city: editCity,
                    state: editState,
                    country: editCountry,
                    current_job_title: editJobTitle,
                    current_company: editCompany,
                    total_experience: editExperienceTotal,
                    certifications,
                    projects,
                    portfolio_links: portfolioLinks,
                    expected_salary: expectedSalary,
                    preferred_location: preferredLocation
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(data.user);
                setSaveMsg({ type: "success", text: "Profile updated successfully!" });
                void fetchRecommendations();
            } else {
                setSaveMsg({ type: "error", text: data.error || "Failed to save." });
            }
        } catch {
            setSaveMsg({ type: "error", text: "Network error." });
        } finally {
            setSaving(false);
        }
    };

    const computeCompletionScore = () => {
        if (!profile) return 0;
        let score = 0;
        if (profile.name) score += 8;
        if (profile.headline) score += 8;
        if (profile.bio) score += 8;
        if (profile.phone) score += 5;
        if (profile.city || profile.state || profile.country) score += 5;
        if (profile.skills && profile.skills.length > 0) score += 12;
        if (profile.experience && profile.experience.length > 0) score += 12;
        if (profile.education && profile.education.length > 0) score += 8;
        if (profile.current_job_title) score += 5;
        if (profile.current_company) score += 5;
        if (profile.resume_url) score += 8;
        if (profile.certifications && profile.certifications.length > 0) score += 5;
        if (profile.projects && profile.projects.length > 0) score += 5;
        if (profile.expected_salary) score += 3;
        if (profile.preferred_location) score += 3;
        return Math.min(100, score);
    };

    const completionScore = computeCompletionScore();
    const isProfileIncomplete = completionScore < 100;

    const addSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill("");
        }
    };

    const removeSkill = (skill: string) => {
        setSkills(skills.filter(s => s !== skill));
    };

    if (loading) {
        return (
            <div className="flex min-h-screen pt-20 bg-background">
                <main className="flex-1 p-4 md:p-6">
                    <div className="max-w-5xl mx-auto animate-pulse">
                        {/* Mini header skeleton */}
                        <div className="hidden md:flex items-center gap-4 mb-8 bg-muted/30 p-4 rounded-xl border border-border/50">
                            <div className="w-10 h-10 rounded-xl bg-muted" />
                            <div className="space-y-2">
                                <div className="h-3 w-36 bg-muted rounded" />
                                <div className="h-2 w-24 bg-muted/60 rounded" />
                            </div>
                        </div>
                        {/* Greeting skeleton */}
                        <div className="flex justify-between items-start mb-10">
                            <div className="space-y-3">
                                <div className="h-6 w-44 bg-muted rounded-lg" />
                                <div className="h-3 w-60 bg-muted/60 rounded" />
                            </div>
                            <div className="flex gap-3">
                                <div className="h-11 w-36 bg-muted rounded-xl" />
                                <div className="h-11 w-40 bg-muted rounded-xl" />
                            </div>
                        </div>
                        {/* Stats grid skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="glass rounded-xl p-6 border border-border">
                                    <div className="h-2.5 w-24 bg-muted rounded mb-5" />
                                    <div className="h-6 w-10 bg-muted rounded mb-4" />
                                    {i === 1 && <div className="h-1.5 w-full bg-muted rounded-full" />}
                                </div>
                            ))}
                        </div>
                        {/* Content skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="h-5 w-36 bg-muted rounded mb-4" />
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="liquid-glass rounded-xl p-6 border border-border flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-48 bg-muted rounded" />
                                            <div className="h-3 w-32 bg-muted/60 rounded" />
                                        </div>
                                        <div className="h-7 w-20 bg-muted rounded-xl" />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <div className="h-5 w-28 bg-muted rounded mb-4" />
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="glass rounded-xl p-6 border border-border space-y-3">
                                        <div className="h-4 w-40 bg-muted rounded" />
                                        <div className="h-3 w-28 bg-muted/60 rounded" />
                                        <div className="flex justify-between pt-2">
                                            <div className="h-3 w-16 bg-muted/50 rounded" />
                                            <div className="w-2 h-2 rounded-full bg-muted" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }


    const currentAvatarUrl = profile?.avatar_url ? fixGoogleDriveUrl(profile.avatar_url) : null;
    const headerPlaceholderAvatar = `/avatars/${(profile?.gender || "male").toLowerCase()}.png`;
    const profilePlaceholderAvatar = `/avatars/${(editGender || "male").toLowerCase()}.png`;
    const globalPercentile = Math.max(0, Math.min(100, Math.round(profile?.ai_percentile || 0)));
    const recruiterViews = profile?.profile_views || 0;
    const conceptCoverage = Math.max(0, Math.min(100, Math.round(profile?.ai_concept_coverage || 0)));
    const confidenceScore = Math.max(0, Math.min(100, Math.round(profile?.ai_confidence_score || 0)));

    return (
        <div className="flex min-h-screen pt-20 bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
            {/* Main */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0">
                <div className={`${tab === "jobs" ? "max-w-7xl" : "max-w-5xl"} mx-auto`}>

                    {/* Dashboard Mini Header */}
                    <div className={`flex items-center gap-4 mb-8 bg-muted/30 p-4 rounded-xl border border-border/50 ${tab === "overview" ? "" : "hidden md:flex"}`}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#FF7A00] to-[#D97706] p-0.5 shadow-sm shadow-[#FF7A00]/10">
                            <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                {currentAvatarUrl ? (
                                    <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    <img src={headerPlaceholderAvatar} alt="Default avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-foreground font-bold text-sm leading-none">
                                {tab === "overview" ? "Dashboard Overview" : tab === "jobs" ? "Job Discovery" : tab === "profile" ? "Edit Profile" : tab === "applications" ? "Applied Jobs" : "Saved Jobs"}
                            </h3>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-1 opacity-60">Talorix Candidate</p>
                        </div>
                        {tab === "overview" && (
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-all flex items-center gap-2 group"
                                title="Logout"
                            >
                                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Logout</span>
                            </button>
                        )}
                    </div>



                    <AnimatePresence mode="wait">
                        {/* ── OVERVIEW TAB ── */}
                        {tab === "overview" && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                                <div>
                                    <h1 className="text-lg font-semibold font-heading text-foreground tracking-tight">
                                        Hello, <span className="shimmer-text">{profile?.name?.split(" ")[0]}</span>!
                                    </h1>
                                    <p className="text-muted-foreground text-sm mt-2 font-medium">Your career trajectory is looking promising.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 sm:mt-0">
                                    <button onClick={() => setIsRecommendModalOpen(true)} className="w-full md:w-auto bg-muted hover:bg-border text-foreground border border-border font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center hover:-translate-y-1 active:scale-95">
                                        Recommend Yourself
                                        <svg className="w-5 h-5 ml-2 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                    <Link href={candidateJobsHref} className="w-full md:w-auto bg-[#FF7A00] hover:bg-[#FBBF24] text-foreground font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center shadow-xl shadow-[#FF7A00]/20 hover:-translate-y-1 active:scale-95">
                                        Browse Opportunities
                                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </Link>
                                </div>
                            </div>

                             {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
                                <div className="liquid-glass rounded-xl p-4 sm:p-5 border-border relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-[#FF7A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
                                    </div>
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Global Rank</h3>
                                    <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
                                        <p className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">#{profile?.ai_rank || "N/A"}</p>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Percentile {globalPercentile}%</span>
                                    </div>
                                    <div className="w-full bg-muted/30 h-1 rounded-full mt-4 overflow-hidden">
                                        <div className="bg-primary h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,122,0,0.4)]" style={{ width: `${globalPercentile}%` }}></div>
                                    </div>
                                </div>
                                <div className="glass rounded-xl p-4 sm:p-5 border-border relative group overflow-hidden">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Recruiter Views</h3>
                                    <p className="text-xl sm:text-2xl font-black text-foreground mt-3 tracking-tighter">{recruiterViews}</p>
                                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                        Stored Profile Views
                                    </p>
                                </div>
                                <div className="glass rounded-xl p-4 sm:p-5 border-border relative group overflow-hidden">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Concept Coverage</h3>
                                    <p className="text-xl sm:text-2xl font-black text-foreground mt-3 tracking-tighter">{conceptCoverage}%</p>
                                    <p className="text-[8px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest mt-1.5 leading-tight">Latest Assessment Coverage</p>
                                </div>
                                <div className="glass rounded-xl p-4 sm:p-5 border-border relative group overflow-hidden">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Confidence</h3>
                                    <p className="text-xl sm:text-2xl font-black text-foreground mt-3 tracking-tighter">{confidenceScore}%</p>
                                    <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        Assessment Confidence
                                    </p>
                                </div>
                            </div>

                            {/* Upcoming Interviews */}
                            <UpcomingInterviews />

                            {isProfileIncomplete && (
                                <div className="mb-8 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-[#FF7A00] via-[#D97706] to-[#B45309] text-foreground shadow-md shadow-[#FF7A00]/20 overflow-hidden relative group">
                                    <div className="relative z-10 max-w-2xl">
                                        <div className="mb-4 inline-flex items-center gap-3 rounded-xl bg-black/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
                                            <span>Profile Completion</span>
                                            <span className="rounded-lg bg-black px-2.5 py-1 text-white">{completionScore}%</span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold font-heading uppercase tracking-tight mb-2">Turbocharge Your Reach</h3>
                                        <p className="text-foreground/90 text-[11px] sm:text-sm mb-6 font-bold leading-snug">
                                            Your profile is only {completionScore}% completed. Complete your profile to reach 100% and unlock stronger visibility for recruiters and AI-matched opportunities.
                                        </p>
                                        <div className="mb-6 w-full max-w-md overflow-hidden rounded-full bg-black/15">
                                            <div
                                                className="h-2.5 rounded-full bg-black/80 transition-all duration-500"
                                                style={{ width: `${completionScore}%` }}
                                            />
                                        </div>
                                        <button onClick={() => setTab("profile")} className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-xl shadow-black/20">Refine Profile Now</button>
                                    </div>
                                    <svg className="absolute -right-8 -bottom-8 w-48 h-48 text-foreground/10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground tracking-tight">Recent Activity</h3>
                                        {recentActivityApplications.length > 5 && <button onClick={() => setTab("applications")} className="text-[#FF7A00] text-sm font-bold hover:underline tracking-tight">Expand View</button>}
                                    </div>
                                    {recentActivityApplications.length === 0 ? (
                                        <div className="glass rounded-xl p-8 sm:p-12 border-border text-center">
                                            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-5 rotate-12">
                                                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <h4 className="text-foreground font-semibold text-base sm:text-xl mb-1.5 leading-tight">The starting line</h4>
                                            <p className="text-muted-foreground text-xs sm:text-sm mb-6 font-medium max-w-[240px] mx-auto opacity-70">Your application history will appear here once you take the leap.</p>
                                            <Link href={candidateJobsHref} className="inline-block bg-muted hover:bg-border text-foreground px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-border">Discover Jobs</Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {recentActivityPreview.map(app => (
                                                <div key={app.id} className="liquid-glass rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 hover:translate-x-2 transition-all group">
                                                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform overflow-hidden">
                                                            {app.job.employer?.company_logo_url ? (
                                                                <img src={fixGoogleDriveUrl(app.job.employer.company_logo_url)!} alt={app.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                            ) : app.job.employer?.avatar_url ? (
                                                                <img src={fixGoogleDriveUrl(app.job.employer.avatar_url)!} alt={app.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                            ) : (
                                                                <span className="text-xl sm:text-2xl font-semibold font-heading text-[#FF7A00]">{app.job.company_name.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-foreground font-semibold text-base sm:text-lg leading-tight truncate">
                                                                <Link href={`/jobs/${app.job.id}`} className="hover:text-[#FF7A00] transition-colors duration-300">{app.job.job_title}</Link>
                                                            </h4>
                                                            <p className="text-gray-400 font-medium text-[13px] mt-1 uppercase tracking-wide truncate">
                                                                <Link href={`/company/${app.job.posted_by}`} className="hover:text-[#FF7A00] transition-colors duration-300">{app.job.company_name}</Link>
                                                                <span className="mx-1.5 sm:mx-2 text-muted-foreground">/</span>
                                                                <span className="normal-case tracking-normal">{new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <Link
                                                            href={`/candidate/interview-sim/${app.job.id}`}
                                                            className={`flex-1 sm:flex-none text-center px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl font-semibold text-[10px] sm:text-[13px] font-medium uppercase tracking-widest sm:tracking-[0.15em] border transition-all ${app.pendingAttempts > 0
                                                                ? "bg-muted text-foreground border-border hover:bg-[#FF7A00] hover:text-foreground"
                                                                : "bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed opacity-50"
                                                                }`}
                                                            onClick={(e) => {
                                                                if (app.pendingAttempts <= 0) e.preventDefault();
                                                            }}
                                                        >
                                                            {app.pendingAttempts > 0 ? "Simulate Interview" : "0 Attempts Left"}
                                                            {app.pendingAttempts > 0 && <span className="block text-[10px] sm:text-[10px] lowercase tracking-normal text-muted-foreground mt-0.5">{app.pendingAttempts} attempt(s) left</span>}
                                                        </Link>
                                                        <div className={`flex-1 sm:flex-none text-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-semibold text-[10px] sm:text-[13px] font-medium uppercase tracking-widest sm:tracking-[0.15em] ${app.application_status === "hired" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                                            app.application_status === "rejected" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                                                "bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20"
                                                            }`}>
                                                            {app.application_status}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-10">
                                    <div>
                                        <h3 className="text-lg font-semibold font-heading text-foreground tracking-tight mb-6">AI Curated</h3>
                                        {loadingRecommendations ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl border border-border"></div>)}
                                            </div>
                                        ) : recommendedJobs.length === 0 ? (
                                            <div className="glass rounded-xl p-6 border-border text-center shadow-inner">
                                                <p className="text-muted-foreground text-sm font-bold leading-relaxed">Fuel our AI by adding more skills to your profile.</p>
                                                <button onClick={() => setTab("profile")} className="mt-6 text-[#FF7A00] text-sm font-semibold uppercase tracking-widest hover:underline">Update Arsenal</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {recommendedJobs.map(job => (
                                                    <Link key={job.id} href={`/jobs/${job.id}`} className="block glass rounded-xl p-6 border-border hover:border-[#FF7A00]/40 transition-all group hover:-translate-y-1 shadow-sm shadow-black/5">
                                                        <h4 className="text-foreground font-semibold text-base sm:text-lg group-hover:text-[#FF7A00] transition-colors duration-300 line-clamp-1">{job.job_title}</h4>
                                                        <p className="text-gray-400 font-medium text-[13px] mt-1 uppercase tracking-wide">{job.company_name}</p>
                                                        {job.ai_reason && (
                                                            <p className="text-muted-foreground text-xs mt-3 leading-relaxed line-clamp-2">{job.ai_reason}</p>
                                                        )}
                                                        <div className="flex items-center justify-between mt-6">
                                                            <span className="text-[13px] font-medium text-muted-foreground uppercase font-semibold tracking-widest">{job.job_type}</span>
                                                            {typeof job.ai_match_score === "number" ? (
                                                                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7A00]">{job.ai_match_score}% fit</span>
                                                            ) : (
                                                                <div className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse"></div>
                                                            )}
                                                        </div>
                                                    </Link>
                                                ))}
                                                <Link href={candidateJobsHref} className="block text-center pt-2 text-[13px] font-medium font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-[#FF7A00] transition-colors duration-300">See all matches &rarr;</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {tab === "jobs" && (
                        <motion.div
                            key="jobs"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CandidateJobsPanel embedded />
                        </motion.div>
                    )}

                    {/* ── PROFILE TAB ── */}
                    {tab === "profile" && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-3xl"
                        >
                            <h1 className="text-lg font-semibold font-heading text-foreground mb-3 tracking-tight">Identity</h1>
                            <p className="text-muted-foreground text-sm mb-12 font-medium">Curate your professional presence for the modern market.</p>

                            {/* Avatar preview */}
                            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-5 sm:p-6 glass rounded-xl border-border shadow-md shadow-black/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <svg className="w-24 h-24 sm:w-32 sm:h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                </div>
                                <div className="relative">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#FF7A00] to-[#D97706] p-1 shadow-md shadow-[#FF7A00]/20 rotate-3 sm:rotate-6 group-hover:rotate-0 transition-transform duration-500">
                                        <div className="w-full h-full rounded-[1.8rem] bg-muted flex items-center justify-center overflow-hidden">
                                            {currentAvatarUrl ? (
                                                <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                            ) : (
                                                <img src={profilePlaceholderAvatar} alt="Default avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 text-center sm:text-left z-10">
                                    <p className="text-foreground font-semibold text-xl sm:text-2xl tracking-tight">{editName || profile?.name}</p>
                                    <p className="text-[#FF7A00] text-sm font-bold uppercase tracking-widest mt-1">{editHeadline || "Strategic Professional"}</p>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-6 mt-6">
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            {profile?.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            {[editCity, editState, editCountry].filter(Boolean).join(", ") || "Global Citizen"}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-5">
                                        <button onClick={() => document.getElementById("avatar-upload")?.click()} disabled={uploadingAvatar} className="bg-muted hover:bg-border text-foreground px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-border disabled:opacity-50">
                                            {currentAvatarUrl ? "Replace Photo" : "Upload Photo"}
                                        </button>
                                        {currentAvatarUrl && (
                                            <button onClick={handleDeleteAvatar} disabled={uploadingAvatar} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-red-500/10 hover:bg-red-500 hover:text-white disabled:opacity-50">Remove Photo</button>
                                        )}
                                        {uploadingAvatar && <p className="w-full text-[#FF7A00] text-[10px] font-bold uppercase tracking-widest animate-pulse">Updating profile image...</p>}
                                    </div>
                                    <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </div>
                            </div>

                            {saveMsg && (
                                <div className={`mb-8 p-6 rounded-xl text-sm font-bold border flex items-center animate-in slide-in-from-top-2 duration-300 ${saveMsg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-[#FF7A00]/10 border-[#FF7A00]/20 text-[#FF7A00]"}`}>
                                    <div className={`mr-4 p-2 rounded-xl ${saveMsg.type === "success" ? "bg-green-500 text-white" : "bg-[#FF7A00] text-foreground"}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {saveMsg.type === "success"
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            }
                                        </svg>
                                    </div>
                                    {saveMsg.text}
                                </div>
                            )}

                            <div className="space-y-8 mb-12">
                                <section>
                                    <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest sm:tracking-[0.2em] mb-4 sm:mb-6 border-l-4 border-[#FF7A00] pl-3 sm:pl-4">Core Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { label: "Full Name", value: editName, set: setEditName, placeholder: "Rahul Sharma", type: "text" },
                                            { label: "Phone Number", value: editPhone, set: setEditPhone, placeholder: "+91 98765 43210", type: "tel" },
                                            { label: "Headline", value: editHeadline, set: setEditHeadline, placeholder: "e.g. Lead Product Architect", type: "text", full: true },
                                        ].map(field => (
                                            <div key={field.label} className={field.full ? "md:col-span-2" : ""}>
                                                <label className="block text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider sm:tracking-widest">{field.label}</label>
                                                <input
                                                    type={field.type}
                                                    value={field.value}
                                                    onChange={e => field.set(e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-background border border border-border rounded-lg sm:rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.25em] mb-6 border-l-4 border-[#FF7A00] pl-4">Current Status</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Job Title</label>
                                            <input
                                                value={editJobTitle}
                                                onChange={e => setEditJobTitle(e.target.value)}
                                                placeholder="e.g. Senior Software Engineer"
                                                className="w-full bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Company</label>
                                            <input
                                                value={editCompany}
                                                onChange={e => setEditCompany(e.target.value)}
                                                placeholder="e.g. Google"
                                                className="w-full bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Professional Experience (Total)</label>
                                            <input
                                                value={editExperienceTotal}
                                                onChange={e => setEditExperienceTotal(e.target.value)}
                                                placeholder="e.g. 8+ Years"
                                                className="w-full bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.25em] mb-6 border-l-4 border-[#FF7A00] pl-4">Location & Representation</h3>
                                    <div className="mb-6">
                                        <LocationSelector
                                            values={{ country: editCountry, state: editState, city: editCity }}
                                            onChange={(loc) => {
                                                setEditCountry(loc.country);
                                                setEditState(loc.state);
                                                setEditCity(loc.city);
                                            }}
                                            gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-6"
                                            variant="candidate"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Avatar Persona</label>
                                        <div className="relative">
                                            <select
                                                value={editGender}
                                                onChange={e => setEditGender(e.target.value)}
                                                className="w-full bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner appearance-none relative z-10"
                                            >
                                                <option value="" disabled>Select Persona...</option>
                                                <option value="male1">Male Character (Yellow Hoodie)</option>
                                                <option value="male2">Male Character (Glasses, Black Hoodie)</option>
                                                <option value="female1">Female Character (Grey Hoodie)</option>
                                                <option value="female2">Female Character (Glasses, Green Hoodie)</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.25em] mb-6 border-l-4 border-[#FF7A00] pl-4">Professional Narrative</h3>
                                    <textarea
                                        value={editBio}
                                        onChange={e => setEditBio(e.target.value)}
                                        placeholder="Craft a compelling story of your professional journey..."
                                        rows={8}
                                        className="w-full bg-background border border border-border rounded-xl px-5 py-6 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all resize-none shadow-inner leading-relaxed"
                                    />
                                </section>

                                {/* Skills Section */}
                                <section className="pt-8 border-t border-border">
                                    <h3 className="text-2xl font-semibold font-heading text-foreground mb-6 tracking-tight">Arsenal</h3>
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {skills.map(skill => (
                                            <span key={skill} className="bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest flex items-center group hover:bg-[#FF7A00] hover:text-foreground transition-all">
                                                {skill}
                                                <button onClick={() => removeSkill(skill)} className="ml-3 opacity-50 group-hover:opacity-100 hover:scale-125 transition-all">&times;</button>
                                            </span>
                                        ))}
                                        {skills.length === 0 && <p className="text-muted-foreground text-sm font-bold italic">No skills added yet.</p>}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={e => setNewSkill(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && addSkill()}
                                            placeholder="Add skill (e.g. Cloud Architecture)"
                                            className="flex-1 min-w-0 bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 shadow-inner"
                                        />
                                        <button onClick={addSkill} className="w-full sm:w-auto bg-gradient-to-br from-[#FF7A00] to-[#D97706] text-foreground px-5 py-3 sm:py-0 rounded-xl font-semibold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-sm shadow-[#FF7A00]/20">Deploy</button>
                                    </div>
                                </section>

                                {/* Experience Section */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 mb-5 sm:mb-8">
                                        <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground">Work Experience</h3>
                                        <button
                                            onClick={() => setExperience([...experience, { company: "", role: "", startYear: "", endYear: "", description: "" }])}
                                            className="text-[#FF7A00] text-xs sm:text-sm font-bold uppercase hover:text-[#D97706] transition-colors duration-300"
                                        >
                                            + ADD EXPERIENCE
                                        </button>
                                    </div>
                                    <div className="space-y-4 sm:space-y-6">
                                        {experience.map((exp, idx) => (
                                            <div key={idx} className="glass p-4 sm:p-6 rounded-xl border-border relative group animate-in slide-in-from-right-4 duration-300">
                                                <button onClick={() => setExperience(experience.filter((_, i) => i !== idx))} className="absolute top-4 sm:top-6 right-4 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Company</label>
                                                        <input
                                                            value={exp.company}
                                                            onChange={e => {
                                                                const n = [...experience]; n[idx].company = e.target.value; setExperience(n);
                                                            }}
                                                            className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Role Title</label>
                                                        <input
                                                            value={exp.role}
                                                            onChange={e => {
                                                                const n = [...experience]; n[idx].role = e.target.value; setExperience(n);
                                                            }}
                                                            className="w-full bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Start Year</label>
                                                        <input
                                                            placeholder="e.g. 2020"
                                                            value={exp.startYear || exp.duration?.split("—")[0]?.trim() || ""}
                                                            onChange={e => {
                                                                const n = [...experience]; n[idx].startYear = e.target.value; setExperience(n);
                                                            }}
                                                            className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">End Year</label>
                                                        <input
                                                            placeholder="e.g. 2023 or Present"
                                                            value={exp.endYear || exp.duration?.split("—")[1]?.trim() || ""}
                                                            onChange={e => {
                                                                const n = [...experience]; n[idx].endYear = e.target.value; setExperience(n);
                                                            }}
                                                            className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Key Contributions</label>
                                                    <textarea
                                                        value={exp.description}
                                                        onChange={e => {
                                                            const n = [...experience]; n[idx].description = e.target.value; setExperience(n);
                                                        }}
                                                        className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-medium h-32 resize-none focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Education Section */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 mb-5 sm:mb-8">
                                        <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground">Education History</h3>
                                        <button
                                            onClick={() => setEducation([...education, { school: "", degree: "", startYear: "", endYear: "", details: "" }])}
                                            className="text-[#FF7A00] text-xs sm:text-sm font-bold uppercase hover:text-[#D97706] transition-colors duration-300"
                                        >
                                            + ADD EDUCATION
                                        </button>
                                    </div>
                                    <div className="space-y-4 sm:space-y-6">
                                        {education.map((edu, idx) => (
                                            <div key={idx} className="glass p-4 sm:p-6 rounded-xl border-border relative group">
                                                <button onClick={() => setEducation(education.filter((_, i) => i !== idx))} className="absolute top-4 sm:top-6 right-4 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Institution</label>
                                                        <input value={edu.school} onChange={e => { const n = [...education]; n[idx].school = e.target.value; setEducation(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Degree / Certificate</label>
                                                        <input value={edu.degree} onChange={e => { const n = [...education]; n[idx].degree = e.target.value; setEducation(n); }} className="w-full bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Start Year</label>
                                                        <input placeholder="e.g. 2016" value={edu.startYear || edu.duration?.split("—")[0]?.trim() || ""} onChange={e => { const n = [...education]; n[idx].startYear = e.target.value; setEducation(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">End Year</label>
                                                        <input placeholder="e.g. 2020" value={edu.endYear || edu.duration?.split("—")[1]?.trim() || ""} onChange={e => { const n = [...education]; n[idx].endYear = e.target.value; setEducation(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-2 uppercase tracking-widest pl-1">Details</label>
                                                    <textarea value={edu.details} onChange={e => { const n = [...education]; n[idx].details = e.target.value; setEducation(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-medium h-32 resize-none focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Social Links */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground mb-4 sm:mb-6">Social & Professional Links</h3>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="flex items-center gap-3 sm:gap-4 bg-background border border border-border rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 focus-within:ring-2 focus-within:ring-[#FF7A00]/20">
                                            <span className="text-xs sm:text-sm font-medium text-muted-foreground min-w-[60px] sm:min-w-[70px]">LinkedIn</span>
                                            <input value={socialLinks.linkedin} onChange={e => setSocialLinks({ ...socialLinks, linkedin: e.target.value })} placeholder="www.linkedin.com/in/username" className="w-full bg-transparent text-foreground text-xs sm:text-sm focus:outline-none" />
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-4 bg-background border border border-border rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 focus-within:ring-2 focus-within:ring-[#FF7A00]/20">
                                            <span className="text-xs sm:text-sm font-medium text-muted-foreground min-w-[60px] sm:min-w-[70px]">GitHub</span>
                                            <input value={socialLinks.github} onChange={e => setSocialLinks({ ...socialLinks, github: e.target.value })} placeholder="https://github.com/username" className="w-full bg-transparent text-foreground text-xs sm:text-sm focus:outline-none" />
                                        </div>
                                    </div>
                                </section>

                                {/* Certifications Section */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 mb-5 sm:mb-8">
                                        <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground">Certifications</h3>
                                        <button onClick={() => setCertifications([...certifications, { name: "", issuer: "", date: "", url: "" }])} className="text-[#FF7A00] text-xs sm:text-sm font-bold uppercase hover:text-[#D97706] transition-colors duration-300">+ ADD CERTIFICATION</button>
                                    </div>
                                    <div className="space-y-4 sm:space-y-6">
                                        {certifications.map((cert, idx) => (
                                            <div key={idx} className="glass p-4 sm:p-6 rounded-xl border-border relative">
                                                <button onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))} className="absolute top-4 sm:top-6 right-4 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-0">
                                                    <input placeholder="Certification Name" value={cert.name} onChange={e => { const n = [...certifications]; n[idx].name = e.target.value; setCertifications(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                    <input placeholder="Issuing Org" value={cert.issuer} onChange={e => { const n = [...certifications]; n[idx].issuer = e.target.value; setCertifications(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                    <input placeholder="Date (e.g. Dec 2024)" value={cert.date} onChange={e => { const n = [...certifications]; n[idx].date = e.target.value; setCertifications(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                    <input placeholder="Credential URL" value={cert.url} onChange={e => { const n = [...certifications]; n[idx].url = e.target.value; setCertifications(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Projects Section */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 mb-5 sm:mb-8">
                                        <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground">Projects</h3>
                                        <button onClick={() => setProjects([...projects, { title: "", description: "", url: "", technologies: "" }])} className="text-[#FF7A00] text-xs sm:text-sm font-bold uppercase hover:text-[#D97706] transition-colors duration-300">+ ADD PROJECT</button>
                                    </div>
                                    <div className="space-y-4 sm:space-y-6">
                                        {projects.map((proj, idx) => (
                                            <div key={idx} className="glass p-4 sm:p-6 rounded-xl border-border relative">
                                                <button onClick={() => setProjects(projects.filter((_, i) => i !== idx))} className="absolute top-4 sm:top-6 right-4 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 mt-4 sm:mt-0">
                                                    <input placeholder="Project Title" value={proj.title} onChange={e => { const n = [...projects]; n[idx].title = e.target.value; setProjects(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                    <input placeholder="Project URL" value={proj.url} onChange={e => { const n = [...projects]; n[idx].url = e.target.value; setProjects(n); }} className="bg-background border border border-border rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground font-bold" />
                                                </div>
                                                <input placeholder="Technologies (e.g. React, Node.js)" value={proj.technologies} onChange={e => { const n = [...projects]; n[idx].technologies = e.target.value; setProjects(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold mb-6" />
                                                <textarea placeholder="Project Description..." value={proj.description} onChange={e => { const n = [...projects]; n[idx].description = e.target.value; setProjects(n); }} className="w-full bg-background border border border-border rounded-xl px-5 py-3 text-sm text-foreground font-medium h-32 resize-none" />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Portfolio Links Section */}
                                <section className="pt-6 sm:pt-8 border-t border-border">
                                    <h3 className="text-base sm:text-lg font-semibold font-heading text-foreground mb-4 sm:mb-6">Portfolio Links</h3>
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {portfolioLinks.map((link, idx) => (
                                            <span key={idx} className="bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center max-w-xs group hover:bg-[#FF7A00] hover:text-foreground transition-all">
                                                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{link}</a>
                                                <button onClick={() => setPortfolioLinks(portfolioLinks.filter((_, i) => i !== idx))} className="ml-3 opacity-50 group-hover:opacity-100">&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <input type="url" value={newPortfolioLink} onChange={e => setNewPortfolioLink(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newPortfolioLink.trim()) { setPortfolioLinks([...portfolioLinks, newPortfolioLink.trim()]); setNewPortfolioLink(""); } }} placeholder="https://your-portfolio.com" className="flex-1 min-w-0 bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20" />
                                        <button onClick={() => { if (newPortfolioLink.trim()) { setPortfolioLinks([...portfolioLinks, newPortfolioLink.trim()]); setNewPortfolioLink(""); } }} className="w-full sm:w-auto bg-[#1f2937] hover:bg-[#374151] text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition-all focus:ring-2 focus:ring-[#FF7A00]/50 hover:shadow-sm">Add</button>
                                    </div>
                                </section>

                                {/* Preferences */}
                                <section className="pt-8 border-t border-border">
                                    <h3 className="text-2xl font-semibold font-heading text-foreground mb-6 tracking-tight">Preferences</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Expected Salary</label>
                                            <input value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g. ₹8,00,000 - ₹12,00,000" className="w-full bg-background border border border-border rounded-xl px-5 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Preferred Location</label>
                                            <LocationSearchBox
                                                value={preferredLocation}
                                                onChange={setPreferredLocation}
                                                placeholder="e.g. Remote, Chennai, Mumbai"
                                                inputClassName="w-full bg-background border border border-border rounded-xl px-5 py-2.5 pr-10 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Status Toggle */}
                                <section className="pt-6 border-t border-border">
                                    <label className="flex items-center cursor-pointer group mb-4">
                                        <div className="relative">
                                            <input type="checkbox" checked={openToWork} onChange={() => setOpenToWork(!openToWork)} className="sr-only" />
                                            <div className={`block w-11 h-6 rounded-full transition-colors duration-300 ${openToWork ? 'bg-[#FF7A00]' : 'bg-muted'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 bg-background w-5 h-5 rounded-full transition-transform shadow-md ${openToWork ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-foreground font-bold text-sm tracking-tight">Open to opportunities</h4>
                                            <p className="text-muted-foreground text-[10px] font-medium opacity-70">Let recruiters know you are actively looking</p>
                                        </div>
                                    </label>
                                </section>

                                {/* Resume Upload */}
                                <section className="pt-6 border-t border-border">
                                    <h3 className="text-lg font-bold font-heading text-foreground mb-4 tracking-tight">Resume</h3>
                                    <div className="flex flex-col gap-3">
                                        {profile?.resume_url && profile.resume_url !== "No resume provided" ? (
                                            <div className="p-4 glass rounded-xl border-border">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-foreground font-bold text-xs truncate">Professional Resume</p>
                                                        <p className="text-muted-foreground text-[10px] mt-0.5 font-medium opacity-60">Synced and ready for applications</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-border text-foreground px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-border flex items-center">
                                                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View
                                                    </a>
                                                    <button onClick={() => document.getElementById("resume-upload")?.click()} disabled={uploadingResume} className="bg-muted hover:bg-border text-foreground px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-border disabled:opacity-50">Replace</button>
                                                    <button onClick={handleDeleteResume} disabled={uploadingResume} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-red-500/10 hover:bg-red-500 hover:text-white disabled:opacity-50">Delete</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => !uploadingResume && document.getElementById("resume-upload")?.click()} className={`border border-dashed border-border rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-[#FF7A00] hover:bg-[#FF7A00]/5 transition-all group ${uploadingResume ? "opacity-50 cursor-wait" : ""}`}>
                                                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                    <svg className="w-5 h-5 text-muted-foreground group-hover:text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                                </div>
                                                <p className="text-foreground font-bold text-xs sm:text-sm mb-0.5">Upload your resume</p>
                                                <p className="text-muted-foreground text-[10px] font-medium opacity-60 uppercase tracking-widest leading-none mt-1.5">PDF, DOC, DOCX up to 5MB</p>
                                                {uploadingResume && <p className="text-[#FF7A00] text-[10px] font-bold mt-4 animate-pulse">Uploading to secure storage...</p>}
                                            </div>
                                        )}
                                        <input id="resume-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                                    </div>
                                </section>
                            </div>

                            {/* Sticky Save Button */}
                            <div className="sticky bottom-6 z-30 flex justify-end mt-10">
                                <button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-to-br from-[#FF7A00] to-[#D97706] text-foreground px-8 py-2.5 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#FF7A00]/30 disabled:opacity-50 disabled:grayscale flex items-center gap-2.5 group">
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                            Archiving...
                                        </>
                                    ) : (
                                        <>
                                            Commit Changes
                                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── SAVED TAB ── */}
                    {tab === "saved" && (
                        <motion.div
                            key="saved"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-2xl"
                        >
                                <h1 className="text-lg font-semibold font-heading text-foreground mb-2">Saved Jobs</h1>
                                <p className="text-muted-foreground text-sm mb-8">Jobs you&apos;ve bookmarked for later.</p>

                                <div className="space-y-4">
                                    {savedJobs.length === 0 ? (
                                        <div className="glass rounded-xl p-6 text-center border border-border">
                                            <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                            <p className="font-medium text-muted-foreground">No saved jobs yet.</p>
                                            <Link href={candidateJobsHref} className="text-[#FF7A00] hover:underline text-sm mt-2 inline-block font-bold">Browse jobs →</Link>
                                        </div>
                                    ) : (
                                        savedJobs.map((sj) => (
                                            <div key={sj.id} className="glass rounded-xl p-5 border border-border flex justify-between items-center group hover:border-[#FF7A00]/30 transition-all">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-11 h-11 rounded-xl bg-[#FF7A00]/10 border border-border flex items-center justify-center font-bold text-[#FF7A00] transition-colors duration-300 overflow-hidden">
                                                        {sj.job.employer?.company_logo_url ? (
                                                            <img src={fixGoogleDriveUrl(sj.job.employer.company_logo_url)!} alt={sj.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                        ) : sj.job.employer?.avatar_url ? (
                                                            <img src={fixGoogleDriveUrl(sj.job.employer.avatar_url)!} alt={sj.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                        ) : (
                                                            sj.job.company_name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base sm:text-lg font-semibold text-foreground">
                                                            <Link href={`/jobs/${sj.job.id}`} className="hover:text-[#FF7A00] transition-colors duration-300">{sj.job.job_title}</Link>
                                                        </h3>
                                                        <p className="text-gray-400 font-medium text-[13px] mt-0.5 uppercase tracking-wide">
                                                            <Link href={`/company/${sj.job.posted_by}`} className="hover:text-[#FF7A00] transition-colors duration-300">{sj.job.company_name}</Link>
                                                            <span className="mx-1.5">·</span>
                                                            <span className="normal-case tracking-normal">{sj.job.city}, {sj.job.state}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Link href={`/jobs/${sj.job.id}`} className="bg-muted hover:bg-[#FF7A00] text-foreground hover:text-foreground px-4 py-2 rounded-lg text-sm font-bold transition-colors duration-300 border border-border hover:border-[#FF7A00]">View</Link>
                                                    <button
                                                        onClick={() => handleRemoveBookmark(sj.job_id)}
                                                        className="text-muted-foreground hover:text-[#FF7A00] transition-colors duration-300 p-2 rounded-lg hover:bg-[#FF7A00]/10"
                                                        title="Remove"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                        </motion.div>
                    )}

                    {/* ── APPLICATIONS TAB ── */}
                    {tab === "applications" && (
                        <motion.div
                            key="applications"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-4xl"
                        >
                            <div className="max-w-4xl">
                                <h1 className="text-lg font-semibold font-heading text-foreground mb-2">My Applications</h1>
                                <p className="text-muted-foreground text-sm mb-8">Track the status of jobs you&apos;ve applied for.</p>

                                <div className="space-y-4">
                                    {applications.length === 0 ? (
                                        <div className="glass rounded-xl p-6 text-center border border-border">
                                            <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <p className="font-medium text-muted-foreground">No applications found.</p>
                                            <Link href={candidateJobsHref} className="text-[#FF7A00] hover:underline text-sm mt-2 inline-block font-bold">Start applying →</Link>
                                        </div>
                                    ) : (
                                        applications.map((app) => {
                                            const visibleInterview = getVisibleApplicationInterview(app);
                                            return (
                                            <div key={app.id} className="glass rounded-xl p-5 border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-4 group hover:border-[#FF7A00]/30 transition-all">
                                                <div className="flex gap-4 items-start sm:items-center">
                                                    <div className="w-12 h-12 rounded-xl bg-[#FF7A00]/10 border border-border flex items-center justify-center font-bold text-[#FF7A00] transition-colors duration-300 shrink-0 overflow-hidden">
                                                        {app.job.employer?.company_logo_url ? (
                                                            <img src={fixGoogleDriveUrl(app.job.employer.company_logo_url)!} alt={app.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                        ) : app.job.employer?.avatar_url ? (
                                                            <img src={fixGoogleDriveUrl(app.job.employer.avatar_url)!} alt={app.job.company_name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                                        ) : (
                                                            app.job.company_name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 tracking-tight">
                                                            <Link href={`/jobs/${app.job.id}`} className="hover:text-[#FF7A00] transition-colors duration-300">{app.job.job_title}</Link>
                                                        </h3>
                                                        <div className="flex flex-wrap items-center text-[13px] font-medium text-gray-400 gap-2 uppercase tracking-wide">
                                                            <Link href={`/company/${app.job.posted_by}`} className="hover:text-[#FF7A00] transition-colors duration-300">{app.job.company_name}</Link>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="flex items-center normal-case tracking-normal">
                                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                Applied on {new Date(app.applied_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {visibleInterview && (
                                                            <a
                                                                href={getInterviewAccessHref(visibleInterview)}
                                                                target={visibleInterview.interview_type === "Phone" ? undefined : "_blank"}
                                                                rel={visibleInterview.interview_type === "Phone" ? undefined : "noopener noreferrer"}
                                                                className="inline-flex items-center gap-2 mt-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                                {getInterviewAccessLabel(visibleInterview.interview_type)} interview link
                                                                <span className="text-blue-300/70">
                                                                    until {new Date(visibleInterview.scheduled_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                                                </span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center sm:justify-end gap-4 mt-2 sm:mt-0">
                                                    <div className="flex flex-col items-start sm:items-end">
                                                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${app.application_status === "hired" ? "bg-green-500/10 text-green-500 border-green-500/20" : app.application_status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" : app.application_status === "shortlisted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : app.application_status === "interview" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>
                                                            {app.application_status}
                                                        </span>
                                                    </div>
                                                    <Link href={`/jobs/${app.job.id}`} className="bg-muted hover:bg-[#FF7A00] text-foreground hover:text-foreground p-2.5 rounded-xl transition-colors duration-300 shrink-0 border border-border hover:border-[#FF7A00]" title="View Job Details">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    </Link>
                                                </div>
                                            </div>
                                            );
                                        })
                                    )}
                                </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </main>

            {/* Bottom Tab Bar */}
            <CandidateBottomNav />

            {/* Recommend Yourself Modal */}
            {isRecommendModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsRecommendModalOpen(false)}></div>
                    <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full relative z-10 shadow-2xl shadow-black/25 dark:shadow-black/50 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-2xl font-semibold font-heading text-foreground mb-2">Recommend Yourself</h2>
                        <p className="text-muted-foreground text-sm mb-4 font-medium leading-relaxed">
                            Take a 10-minute AI-powered technical test customized for your desired role. Your score will be directly visible to top employers looking for your skills!
                        </p>

                        <div className={`mb-6 p-4 rounded-xl border ${recommendAttemptsLeft > 0 ? 'bg-[#FF7A00]/10 border-[#FF7A00]/20 text-[#FF7A00]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <div className="flex items-center gap-2">
                                <svg className={`w-5 h-5 ${recommendAttemptsLeft > 0 ? 'text-[#FF7A00]' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="font-bold text-sm tracking-wide uppercase">Weekly Limit: {recommendAttemptsLeft} / 1 attempts remaining</span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[13px] font-medium font-semibold text-muted-foreground mb-3 uppercase tracking-widest pl-1">Target Role</label>
                            <input
                                autoFocus
                                value={recommendRole}
                                onChange={e => setRecommendRole(e.target.value)}
                                placeholder="e.g. Frontend Developer, Data Scientist..."
                                className="w-full bg-background border border-border rounded-xl px-5 py-3 text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsRecommendModalOpen(false)}
                                className="flex-1 bg-background hover:bg-muted text-foreground border border-border font-semibold py-3 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={recommendAttemptsLeft <= 0}
                                onClick={() => {
                                    if (recommendRole.trim() && recommendAttemptsLeft > 0) {
                                        router.push(`/candidate/interview-sim/recommend?role=${encodeURIComponent(recommendRole)}`);
                                    }
                                }}
                                className={`flex-1 font-semibold py-3 rounded-xl transition-all ${recommendAttemptsLeft > 0 ? 'bg-[#FF7A00] hover:bg-[#D97706] text-black shadow-lg shadow-[#FF7A00]/20' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}`}
                            >
                                Start Assessment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
