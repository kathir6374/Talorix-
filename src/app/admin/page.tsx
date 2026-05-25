"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
    DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS,
    type EmployerSubscriptionPlan,
} from "@/lib/employer-subscription-config";

// --- Types ---
type Tab = "dashboard" | "monetization" | "employers" | "candidates" | "jobs" | "verification" | "reports" | "newsletter" | "settings";

interface Stats {
    totalCandidates: number;
    totalEmployers: number;
    totalJobs?: number;
    jobsPosted: number;
    aiInterviewsCompleted: number;
    activeCompanies: number;
    platformStatus: string;
    totalPosts: number;
    candidateTrend?: string;
    employerTrend?: string;
    jobsTrend?: string;
    aiInterviewTrend?: string;
    postsTrend?: string;
}

interface Settings {
    monetization_enabled: boolean;
    employer_plans: EmployerSubscriptionPlan[];
}

// --- Icons (SVG) ---
const Icons = {
    Dashboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Monetization: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Employers: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    Candidates: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
    Jobs: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Verification: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Reports: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    Newsletter: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Theme: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
};

export default function AdminPanel() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [stats, setStats] = useState<Stats | null>(null);
    const [settings, setSettings] = useState<Settings>({
        monetization_enabled: false,
        employer_plans: DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    const isLightMode = resolvedTheme === "light";

    useEffect(() => setMounted(true), []);

    // Login State
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    async function handleAdminLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail, password: loginPassword }),
            });
            if (res.ok) {
                setError("");
                fetchInitialData();
            } else {
                const data = await res.json();
                showToast(data.error || "Invalid Credentials", "error");
            }
        } catch {
            showToast("Network failure", "error");
        } finally {
            setIsLoggingIn(false);
        }
    }

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogout = async () => {
        try {
            // Client-side cleanup for immediate UI feedback
            document.cookie = "is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch (e) {
            console.error("Logout error:", e);
            showToast("Logout failed", "error");
        } finally {
            // Use hard redirect so cookies are re-evaluated and login screen appears
            window.location.href = "/login";
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        try {
            const [statsRes, settingsRes] = await Promise.all([
                fetch("/api/admin/stats", { credentials: "same-origin" }),
                fetch("/api/admin/settings", { credentials: "same-origin" }),
            ]);

            if (statsRes.status === 401 || statsRes.status === 403) {
                // Not authorized yet — stop loading so the login gate can be shown
                setLoading(false);
                return;
            }

            const statsData = await statsRes.json();
            const settingsData = await settingsRes.json();

            if (!statsRes.ok || !settingsRes.ok) {
                throw new Error(statsData.error || settingsData.error || "Failed to synchronize platform data.");
            }

            setStats(statsData.stats);
            setSettings(settingsData.settings || {
                monetization_enabled: false,
                employer_plans: DEFAULT_EMPLOYER_SUBSCRIPTION_PLANS,
            });
            setIsAuthorized(true);
        } catch (err) {
            setError("Failed to synchronize platform data.");
        } finally {
            setLoading(false);
        }
    }

    const [employerUsers, setEmployerUsers] = useState<any[]>([]);
    const [candidateUsers, setCandidateUsers] = useState<any[]>([]);
    const [verificationEmployers, setVerificationEmployers] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [userSuspendFilter, setUserSuspendFilter] = useState("");
    const [candidateDetails, setCandidateDetails] = useState<any | null>(null);
    const [isCandidateDetailsOpen, setIsCandidateDetailsOpen] = useState(false);
    const [isLoadingCandidateDetails, setIsLoadingCandidateDetails] = useState(false);

    const [reports, setReports] = useState<any[]>([]);
    const [reportFilter, setReportFilter] = useState("pending");
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [isReportDetailsOpen, setIsReportDetailsOpen] = useState(false);
    const [isMoreSettingsOpen, setIsMoreSettingsOpen] = useState(false);
    const [superAdminEmail, setSuperAdminEmail] = useState("");
    const [superAdminPassword, setSuperAdminPassword] = useState("");
    const [superAdminConfirmPassword, setSuperAdminConfirmPassword] = useState("");
    const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
    const [showSuperAdminConfirmPassword, setShowSuperAdminConfirmPassword] = useState(false);
    const [isLoadingSuperAdminSettings, setIsLoadingSuperAdminSettings] = useState(false);
    const [isSavingSuperAdminSettings, setIsSavingSuperAdminSettings] = useState(false);
    const [isDownloadingAllResumes, setIsDownloadingAllResumes] = useState(false);
    const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
    const [isLoadingNewsletterSubscribers, setIsLoadingNewsletterSubscribers] = useState(false);
    const [newsletterTitle, setNewsletterTitle] = useState("");
    const [newsletterContent, setNewsletterContent] = useState("");
    const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
    const [newsletterSendSummary, setNewsletterSendSummary] = useState<{ message: string; successCount?: number; failedCount?: number } | null>(null);

    useEffect(() => {
        if (activeTab === "employers") fetchUsers("employer");
        if (activeTab === "candidates") fetchUsers("candidate");
        if (activeTab === "jobs") fetchJobs();
        if (activeTab === "reports") fetchReports();
        if (activeTab === "newsletter") fetchNewsletterSubscribers();
        if (activeTab === "verification") fetchVerificationEmployers();
    }, [activeTab, searchQuery, filterStatus, reportFilter, userSuspendFilter]);

    async function fetchReports() {
        try {
            const params = new URLSearchParams({ status: reportFilter });
            const res = await fetch(`/api/admin/reports?${params}`, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to fetch reports", "error");
                return;
            }

            setReports(data.reports || []);
        } catch (err) {
            showToast("Failed to fetch reports", "error");
        }
    }

    async function handleReportAction(reportId: string, action: string) {
        try {
            const res = await fetch("/api/admin/reports", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId, action }),
            });
            const data = await res.json();
            if (res.ok) {
                const nextStatus =
                    action === "dismiss" ? "dismissed" :
                    action === "resolve" || action === "remove_job" || action === "suspend_user" || action === "warn_user" ? "resolved" :
                    null;

                if (nextStatus) {
                    setSelectedReport((prev: any) => prev && prev.id === reportId ? { ...prev, status: nextStatus } : prev);
                }
                showToast("Report action completed");
                fetchReports();
            } else {
                showToast(data.error || "Action failed", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    async function fetchNewsletterSubscribers() {
        setIsLoadingNewsletterSubscribers(true);
        try {
            const res = await fetch("/api/admin/newsletter", {
                credentials: "same-origin",
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to load newsletter subscribers", "error");
                return;
            }

            setNewsletterSubscribers(data.subscribers || []);
        } catch {
            showToast("Failed to load newsletter subscribers", "error");
        } finally {
            setIsLoadingNewsletterSubscribers(false);
        }
    }

    async function handleSendNewsletter(e: React.FormEvent) {
        e.preventDefault();
        setIsSendingNewsletter(true);
        setNewsletterSendSummary(null);

        try {
            const res = await fetch("/api/admin/newsletter", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newsletterTitle,
                    content: newsletterContent,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to send newsletter", "error");
                return;
            }

            setNewsletterSendSummary({
                message: data.message,
                successCount: data.successCount,
                failedCount: data.failedCount,
            });
            showToast(data.message || "Newsletter sent successfully");
        } catch {
            showToast("Failed to send newsletter", "error");
        } finally {
            setIsSendingNewsletter(false);
        }
    }

    async function fetchSuperAdminSettings() {
        setIsLoadingSuperAdminSettings(true);
        try {
            const res = await fetch("/api/admin/settings/super-admin", {
                credentials: "same-origin",
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Failed to load super admin settings", "error");
                return;
            }

            setSuperAdminEmail(data.admin?.email || "");
            setSuperAdminPassword("");
            setSuperAdminConfirmPassword("");
        } catch {
            showToast("Failed to load super admin settings", "error");
        } finally {
            setIsLoadingSuperAdminSettings(false);
        }
    }

    async function handleToggleMoreSettings() {
        const nextOpenState = !isMoreSettingsOpen;
        setIsMoreSettingsOpen(nextOpenState);

        if (nextOpenState) {
            await fetchSuperAdminSettings();
        }
    }

    async function handleSaveSuperAdminSettings(e: React.FormEvent) {
        e.preventDefault();

        const trimmedEmail = superAdminEmail.trim().toLowerCase();
        if (!trimmedEmail) {
            showToast("Super admin email is required", "error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            showToast("Please enter a valid email address", "error");
            return;
        }

        if (superAdminPassword && superAdminPassword.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            return;
        }

        if (superAdminPassword !== superAdminConfirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }

        setIsSavingSuperAdminSettings(true);
        try {
            const res = await fetch("/api/admin/settings/super-admin", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: superAdminPassword,
                    confirmPassword: superAdminConfirmPassword,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Failed to update super admin credentials", "error");
                return;
            }

            setSuperAdminEmail(data.admin?.email || trimmedEmail);
            setSuperAdminPassword("");
            setSuperAdminConfirmPassword("");
            showToast(data.message || "Super admin credentials updated successfully");
        } catch {
            showToast("Failed to update super admin credentials", "error");
        } finally {
            setIsSavingSuperAdminSettings(false);
        }
    }

    function getResumeFileNameFromResponse(
        disposition: string | null,
        candidateName: string,
        contentType: string | null
    ) {
        const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
        if (filenameMatch?.[1]) {
            return filenameMatch[1];
        }

        const extensionByMimeType: Record<string, string> = {
            "application/pdf": ".pdf",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        };
        const safeBase = (candidateName || "candidate_resume")
            .replace(/[^a-z0-9_-]/gi, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");

        return `${safeBase || "candidate_resume"}${extensionByMimeType[contentType || ""] || ".bin"}`;
    }

    async function handleDownloadCandidateResume(candidate: any) {
        try {
            const response = await fetch(`/api/candidates/${candidate.id}/resume?download=1`, {
                credentials: "same-origin",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                showToast(data?.error || "Failed to download resume", "error");
                return;
            }

            const resumeBlob = await response.blob();
            if (!resumeBlob.size) {
                showToast("Failed to download resume", "error");
                return;
            }

            const fileName = getResumeFileNameFromResponse(
                response.headers.get("content-disposition"),
                candidate.name || "candidate_resume",
                response.headers.get("content-type")
            );
            const downloadUrl = window.URL.createObjectURL(resumeBlob);
            const downloadLink = document.createElement("a");
            downloadLink.href = downloadUrl;
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Admin resume download error:", error);
            showToast("Failed to download resume", "error");
        }
    }

    async function handleDownloadAllResumes() {
        setIsDownloadingAllResumes(true);
        try {
            const response = await fetch("/api/admin/candidates/resumes", {
                credentials: "same-origin",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                showToast(data?.error || "Failed to download all resumes", "error");
                return;
            }

            const zipBlob = await response.blob();
            if (!zipBlob.size) {
                showToast("Failed to download all resumes", "error");
                return;
            }

            const fileName = getResumeFileNameFromResponse(
                response.headers.get("content-disposition"),
                "candidate_resumes",
                response.headers.get("content-type")
            ).replace(/\.bin$/i, ".zip");
            const downloadUrl = window.URL.createObjectURL(zipBlob);
            const downloadLink = document.createElement("a");
            downloadLink.href = downloadUrl;
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Admin bulk resume download error:", error);
            showToast("Failed to download all resumes", "error");
        } finally {
            setIsDownloadingAllResumes(false);
        }
    }

    async function fetchUsers(role: string) {
        try {
            const params = new URLSearchParams({ role, search: searchQuery, suspendStatus: userSuspendFilter });
            const res = await fetch(`/api/admin/users?${params}`, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to fetch users", "error");
                return;
            }
            if (role === "employer") {
                setEmployerUsers(data.users || []);
            } else {
                setCandidateUsers(data.users || []);
            }
        } catch (err) {
            showToast("Failed to fetch users", "error");
        }
    }

    async function handleViewCandidate(userId: string) {
        setIsCandidateDetailsOpen(true);
        setIsLoadingCandidateDetails(true);
        setCandidateDetails(null);
        try {
            const params = new URLSearchParams({ userId, detail: "true" });
            const res = await fetch(`/api/admin/users?${params}`, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) {
                setIsCandidateDetailsOpen(false);
                showToast(data.error || "Failed to fetch candidate details", "error");
                return;
            }
            setCandidateDetails(data.user || null);
        } catch (err) {
            setIsCandidateDetailsOpen(false);
            showToast("Failed to fetch candidate details", "error");
        } finally {
            setIsLoadingCandidateDetails(false);
        }
    }

    const formatDetailDate = (value: any) => {
        if (!value) return "Not provided";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleString();
    };

    const formatDetailValue = (value: any) => {
        if (value === null || value === undefined || value === "") return "Not provided";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        return String(value);
    };

    const normalizeDetailList = (value: any) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return value.trim() ? [value] : [];
            }
        }
        return typeof value === "object" ? [value] : [String(value)];
    };

    const formatDetailListItem = (item: any) => {
        if (item === null || item === undefined || item === "") return "Not provided";
        if (typeof item !== "object") return String(item);
        const parts = Object.entries(item)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .map(([key, value]) => {
                const label = key.replace(/_/g, " ");
                const formattedValue = Array.isArray(value) ? value.join(", ") : String(value);
                return `${label}: ${formattedValue}`;
            });
        return parts.length ? parts.join(" | ") : "Not provided";
    };

    const renderDetailField = (label: string, value: any) => (
        <div className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${adminSubtleTextClass}`}>{label}</p>
            <p className={`text-sm font-semibold break-words ${adminStrongTextClass}`}>{formatDetailValue(value)}</p>
        </div>
    );

    const getReportCompanyName = (report: any) => {
        if (!report) return "Unknown Company";
        if (report.source === "contact") {
            return report.contactMessage?.name || "Unknown Company";
        }

        return report.job?.company_name || report.reportedUser?.name || report.reporter?.name || "Unknown Company";
    };

    const getReportSenderEmail = (report: any) => {
        if (!report) return "Not provided";
        if (report.source === "contact") {
            return report.contactMessage?.email || "Not provided";
        }

        return report.reporter?.email || "Not provided";
    };

    const getReportMessage = (report: any) => {
        if (!report) return "No additional details provided.";
        if (report.source === "contact") {
            return report.contactMessage?.message || "No message provided.";
        }

        return report.description || "No additional details provided.";
    };

    const getReportDate = (report: any) => {
        if (!report) return "Not provided";
        if (report.source === "contact") {
            return formatDetailDate(report.contactMessage?.created_at || report.created_at);
        }

        return formatDetailDate(report.created_at);
    };

    const getReportSourceType = (report: any) => {
        if (!report) return "User Report";
        if (report.reportSourceType) return report.reportSourceType;
        if (report.reporter?.role === "employer") return "Company Report";
        if (report.reporter?.role === "candidate") return "Candidate Report";
        return "User Report";
    };

    const openReportDetails = (report: any) => {
        setSelectedReport(report);
        setIsReportDetailsOpen(true);
    };

    const selectedReportIsContactMessage = selectedReport?.source === "contact";
    const adminStrongTextClass = isLightMode ? "text-slate-900" : "text-white";
    const adminMutedTextClass = isLightMode ? "text-slate-600" : "text-gray-400";
    const adminSubtleTextClass = isLightMode ? "text-slate-500" : "text-gray-500";
    const adminSecondaryTextClass = isLightMode ? "text-slate-700" : "text-gray-300";
    const adminSurfaceClass = isLightMode ? "bg-white border-slate-200 shadow-sm" : "bg-[#141414] border-white/5";
    const adminSubtleSurfaceClass = isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5";
    const adminSoftSurfaceClass = isLightMode ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5";
    const adminTableHeadClass = isLightMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-gray-500";
    const adminTableRowClass = isLightMode ? "hover:bg-slate-50" : "hover:bg-white/[0.02]";
    const adminGhostButtonClass = isLightMode
        ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white";
    const adminModalOverlayClass = isLightMode ? "absolute inset-0 bg-slate-900/25 backdrop-blur-sm" : "absolute inset-0 bg-black/80 backdrop-blur-sm";
    const renderPasswordVisibilityIcon = (isVisible: boolean) => (
        isVisible ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        )
    );

    const renderDetailList = (label: string, value: any) => {
        const items = normalizeDetailList(value);
        return (
            <div className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${adminSubtleTextClass}`}>{label}</p>
                {items.length ? (
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <p key={`${label}-${index}`} className={`text-sm leading-relaxed break-words ${adminSecondaryTextClass}`}>
                                {formatDetailListItem(item)}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p className={`text-sm font-semibold ${adminStrongTextClass}`}>Not provided</p>
                )}
            </div>
        );
    };

    async function fetchVerificationEmployers() {
        try {
            const params = new URLSearchParams({ role: "employer", search: searchQuery, showSuspended: "true" });
            const res = await fetch(`/api/admin/users?${params}`, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to fetch verification data", "error");
                return;
            }
            setVerificationEmployers(data.users || []);
        } catch (err) {
            showToast("Failed to fetch verification data", "error");
        }
    }

    async function fetchJobs() {
        try {
            const params = new URLSearchParams({ search: searchQuery, status: filterStatus });
            const res = await fetch(`/api/admin/jobs?${params}`, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || "Failed to fetch jobs", "error");
                return;
            }
            setJobs(data.jobs || []);
        } catch (err) {
            showToast("Failed to fetch jobs", "error");
        }
    }

    async function handleUserAction(userId: string, action: string, context?: "employer" | "candidate" | "verification") {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Action completed successfully");
                // Refresh the correct list based on context or active tab
                const ctx = context || (activeTab === "employers" ? "employer" : activeTab === "candidates" ? "candidate" : "verification");
                if (ctx === "verification") {
                    fetchVerificationEmployers();
                } else {
                    fetchUsers(ctx);
                }
            } else {
                showToast(data.error || "Action failed", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    async function handleJobAction(jobId: string, action: string) {
        try {
            const res = await fetch("/api/admin/jobs", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId, action }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Job updated successfully");
                fetchJobs();
            } else {
                showToast(data.error || "Action failed", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    async function toggleMonetization() {
        const newValue = !settings.monetization_enabled;
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monetization_enabled: newValue,
                    employer_plans: settings.employer_plans,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSettings(data.settings || {
                    ...settings,
                    monetization_enabled: newValue,
                });
                showToast(`Monetization ${newValue ? "Enabled" : "Disabled"}`);
            } else {
                showToast(data.error || "Failed to update settings", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    function handleEmployerPlanAmountChange(planKey: EmployerSubscriptionPlan["key"], nextValue: string) {
        const numericOnly = nextValue.replace(/[^\d]/g, "");
        const parsedAmount = numericOnly === "" ? 0 : Number.parseInt(numericOnly, 10);

        setSettings((prev) => ({
            ...prev,
            employer_plans: prev.employer_plans.map((plan) =>
                plan.key === planKey
                    ? { ...plan, monthlyAmount: Number.isFinite(parsedAmount) ? parsedAmount : plan.monthlyAmount }
                    : plan
            ),
        }));
    }

    function handleEmployerYearlyDiscountChange(planKey: EmployerSubscriptionPlan["key"], nextValue: string) {
        const numericOnly = nextValue.replace(/[^\d]/g, "");
        const parsedDiscount = numericOnly === "" ? 0 : Number.parseInt(numericOnly, 10);
        const safeDiscount = Math.max(0, Math.min(100, Number.isFinite(parsedDiscount) ? parsedDiscount : 0));

        setSettings((prev) => ({
            ...prev,
            employer_plans: prev.employer_plans.map((plan) =>
                plan.key === planKey
                    ? { ...plan, yearlyDiscountPercent: safeDiscount }
                    : plan
            ),
        }));
    }

    async function saveEmployerPlanPricing() {
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monetization_enabled: settings.monetization_enabled,
                    employer_plans: settings.employer_plans.map((plan) => ({
                        key: plan.key,
                        monthlyAmount: plan.monthlyAmount,
                        yearlyDiscountPercent: plan.yearlyDiscountPercent,
                        currency: plan.currency,
                    })),
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Failed to save plan pricing", "error");
                return;
            }

            setSettings(data.settings || settings);
            showToast("Employer plan pricing updated");
        } catch {
            showToast("Network error", "error");
        }
    }

    if (error) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
            <div className="bg-card border border-destructive/20 p-8 rounded-3xl max-w-sm text-center shadow-2xl relative z-10">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Platform Connection Error</h2>
                <p className="text-muted-foreground text-sm mb-8">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full bg-primary text-primary-foreground font-black py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20">Retry Connection</button>
            </div>
        </div>
    );

    if (!isAuthorized) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-['Inter']">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card border border-border rounded-[2.5rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
                <div className="flex flex-col items-center text-center mb-10">
                    <img
                        src={mounted && theme === "light" ? "/brand/talorix-black.png" : "/brand/talorix-white.png"}
                        alt="Talorix Logo"
                        className="object-contain mb-6 w-[180px] h-auto"
                        loading="lazy"
                    />
                    <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20 mb-4">
                        <span className="text-[13px] font-medium font-semibold text-primary uppercase tracking-[0.2em]">Restricted Access</span>
                    </div>
                    <h2 className="text-2xl font-semibold font-heading text-foreground tracking-tight">Admin Gate</h2>
                    <p className="text-muted-foreground text-sm mt-2">Please authorize yourself to control the platform.</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">Identity (Email)</label>
                        <input
                            type="email"
                            required
                            name="talorix_admin_identity_manual"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            autoComplete="off"
                            className="w-full bg-muted border border-border rounded-xl px-5 py-3 text-sm focus:border-primary/50 transition-all outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">Access Key (Password)</label>
                        <div className="relative">
                            <input
                                type={showLoginPassword ? "text" : "password"}
                                required
                                name="talorix_admin_access_key_manual"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                autoComplete="off"
                                className="w-full bg-muted border border-border rounded-xl px-5 pr-12 py-3 text-sm focus:border-primary/50 transition-all outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowLoginPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                            >
                                {renderPasswordVisibilityIcon(showLoginPassword)}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-primary hover:bg-amber-400 text-primary-foreground font-semibold py-3 rounded-xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 mt-6 active:scale-95"
                    >
                        {isLoggingIn ? "Authorizing..." : "Access Control Center"}
                    </button>
                </form>

                <p className="text-center text-gray-600 text-[13px] font-medium mt-8 uppercase font-bold tracking-widest">
                    &copy; {new Date().getFullYear()} Talorix Platform Secure Node
                </p>
            </motion.div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-border border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium">Synchronizing Platform Control...</p>
            </div>
        </div>
    );

    return (
        <div className="h-screen overflow-hidden bg-background text-foreground flex font-['Inter']">
            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: -20, x: 20 }}
                        className={`fixed top-6 right-6 z-[100] px-5 py-2.5 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border text-sm font-semibold flex items-center gap-3 ${toast.type === "success" ? `${isLightMode ? "bg-white border-emerald-200" : "bg-[#0A0A0A] border-emerald-500/20"} text-emerald-400` : `${isLightMode ? "bg-white border-red-200" : "bg-[#0A0A0A] border-red-500/20"} text-red-400`
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`fixed md:relative w-72 border-r border-border bg-card flex flex-col h-screen shrink-0 z-40 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 mb-12 px-2">
                        <img
                            src={theme === "dark" || (theme === "system" && systemTheme === "dark") ? "/brand/talorix-white.png" : "/brand/talorix-black.png"}
                            alt="Talorix Logo"
                            className="object-contain w-[160px] h-[40px]"
                            loading="lazy"
                        />
                    </div>

                    <nav className="space-y-1">
                        {[
                            { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
                            { id: "monetization", label: "Monetization", icon: Icons.Monetization },
                            { id: "employers", label: "Employers", icon: Icons.Employers },
                            { id: "candidates", label: "Candidates", icon: Icons.Candidates },
                            { id: "jobs", label: "Job Posts", icon: Icons.Jobs },
                            { id: "verification", label: "Trust & Safety", icon: Icons.Verification },
                            { id: "reports", label: "Mod Queue", icon: Icons.Reports },
                            { id: "newsletter", label: "Newsletter", icon: Icons.Newsletter },
                            { id: "settings", label: "Appearance", icon: Icons.Theme },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id as Tab);
                                    setIsMobileMenuOpen(false);
                                    setSearchQuery(""); // Clear search when switching tabs to avoid stale filters
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 group relative ${activeTab === item.id
                                    ? "bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(245,158,11,0.2)]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    }`}
                            >
                                <span className={`${activeTab === item.id ? "text-black" : isLightMode ? "text-slate-500 group-hover:text-[#FF7A00]" : "text-gray-400 group-hover:text-[#FF7A00]"} transition-colors`}>
                                    <item.icon />
                                </span>
                                {item.label}
                                {activeTab === item.id && (
                                    <motion.div layoutId="activepill" className="ml-auto w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 border-t border-border bg-card">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors group cursor-pointer mb-3 ${adminSoftSurfaceClass} ${isLightMode ? "hover:border-slate-300" : "hover:border-white/10"}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-amber-200 p-[1px]">
                            <div className="w-full h-full rounded-xl bg-card flex items-center justify-center text-xs font-bold text-foreground uppercase">SA</div>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate group-hover:text-[#FF7A00] transition-colors">System Admin</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[13px] font-medium text-muted-foreground font-bold uppercase tracking-wider">Root</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Logout Session
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto bg-background relative scroll-smooth custom-scrollbar">
                <div className="p-6 lg:p-6 max-w-7xl mx-auto min-h-full flex flex-col">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`md:hidden p-2 -ml-2 mt-1 border rounded-lg transition-colors ${isLightMode ? "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200" : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold font-heading tracking-tight text-foreground capitalize">
                                    {activeTab === "jobs" ? "Job Posts" : activeTab}
                                </h1>
                                <p className={`text-[12px] font-medium mt-1 hidden sm:flex items-center gap-2 ${adminSubtleTextClass}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]/30" />
                                    Talorix Platform Overview & Control Center
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[13px] font-medium font-semibold text-emerald-400 uppercase tracking-widest">Live Sync</span>
                            </div>
                            <button
                                onClick={fetchInitialData}
                                className={`p-2.5 border rounded-xl transition-all group shadow-xl active:scale-95 ${isLightMode ? "bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300" : "bg-muted border-border hover:bg-[#222] hover:border-white/10"}`}
                                title="Refresh Platform Data"
                            >
                                <svg className={`w-4 h-4 group-hover:text-[#FF7A00] group-hover:rotate-180 transition-all duration-700 ${adminMutedTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Tab Views */}
                    <AnimatePresence mode="wait">
                        {activeTab === "dashboard" && stats && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                            >
                                {[
                                    { label: "Total Candidates", value: stats.totalCandidates, trend: stats.candidateTrend || "+0%", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg> },
                                    { label: "Total Employers", value: stats.totalEmployers, trend: stats.employerTrend || "+0%", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                                    { label: "Jobs Posted", value: stats.jobsPosted ?? stats.totalJobs ?? 0, trend: stats.jobsTrend || "+0%", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                                    { label: "AI Interviews", value: stats.aiInterviewsCompleted, trend: stats.aiInterviewTrend || "+0%", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                                    { label: "Platform Status", value: stats.platformStatus || "Operational", status: true, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                                ].map((card, i) => (
                                    <div key={i} className="bg-card border border-border p-6 rounded-[2rem] hover:border-primary/30 transition-all group relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-[#FF7A00]/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-500 ${isLightMode ? "bg-slate-100" : "bg-white/5"}`}>
                                                <span className="text-primary">{card.icon}</span>
                                            </div>
                                            {!card.status && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-semibold rounded-lg border border-emerald-500/20">{card.trend}</span>}
                                        </div>
                                        <div>
                                            <p className={`text-[13px] font-medium font-semibold uppercase tracking-[0.2em] mb-1 ${adminSubtleTextClass}`}>{card.label}</p>
                                            <p className={`text-2xl font-semibold font-heading tracking-tight ${card.status ? "text-emerald-400" : adminStrongTextClass}`}>{card.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {activeTab === "monetization" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6 max-w-3xl"
                            >
                                <div className="bg-card rounded-xl border border-border p-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-lg font-bold">Platform Monetization</h3>
                                            <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>Control access to candidate contact information across the platform.</p>
                                        </div>
                                        <button
                                            onClick={toggleMonetization}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${settings.monetization_enabled ? "bg-[#FF7A00]" : isLightMode ? "bg-slate-300" : "bg-white/10"}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.monetization_enabled ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`p-6 rounded-xl border transition-all ${!settings.monetization_enabled ? "bg-emerald-500/5 border-emerald-500/20" : isLightMode ? "bg-slate-50 border-slate-200" : "bg-[#1A1A1A] border-white/5"}`}>
                                            <p className={`text-xs font-bold uppercase mb-2 ${adminSubtleTextClass}`}>When OFF</p>
                                            <ul className="text-sm space-y-2">
                                                <li className={`flex items-center gap-2 ${adminSecondaryTextClass}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Employers see full contact info
                                                </li>
                                                <li className={`flex items-center gap-2 ${adminSecondaryTextClass}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Subscription model is removed entirely
                                                </li>
                                            </ul>
                                        </div>
                                        <div className={`p-6 rounded-xl border transition-all ${settings.monetization_enabled ? "bg-amber-500/5 border-amber-500/20" : isLightMode ? "bg-slate-50 border-slate-200" : "bg-[#1A1A1A] border-white/5"}`}>
                                            <p className={`text-xs font-bold uppercase mb-2 ${adminSubtleTextClass}`}>When ON</p>
                                            <ul className="text-sm space-y-2">
                                                <li className={`flex items-center gap-2 ${adminSecondaryTextClass}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" /> Only sourcing, direct contacts, and AI discovery are paid
                                                </li>
                                                <li className={`flex items-center gap-2 ${adminSecondaryTextClass}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" /> Core employer workflow remains usable for free
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="mt-8 border-t border-border pt-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                            <div>
                                                <h4 className="text-base font-bold text-foreground">Employer Plan Pricing</h4>
                                                <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>Set the subscription amount for each employer plan. These plans become hidden automatically whenever monetization is turned off.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={saveEmployerPlanPricing}
                                                className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                Save Plan Pricing
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                            {settings.employer_plans.map((plan) => (
                                                <div
                                                    key={plan.key}
                                                    className={`rounded-2xl border p-5 ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-[#161616] border-white/5"}`}
                                                >
                                                    <div className="mb-4">
                                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary mb-1">{plan.name}</p>
                                                        <h5 className={`text-xl font-black tracking-tight ${adminStrongTextClass}`}>
                                                            {plan.currency} {plan.monthlyAmount.toLocaleString()} / month
                                                        </h5>
                                                        <p className={`text-sm mt-2 ${adminSubtleTextClass}`}>{plan.description}</p>
                                                        <p className="text-xs font-bold text-primary mt-2">
                                                            Yearly total: {plan.currency} {Math.round((plan.monthlyAmount * 12 * (100 - plan.yearlyDiscountPercent)) / 100).toLocaleString()} ({plan.yearlyDiscountPercent}% off)
                                                        </p>
                                                    </div>

                                                    <label className={`block text-[11px] font-bold uppercase tracking-[0.18em] mb-2 ${adminSubtleTextClass}`}>
                                                        Monthly Amount
                                                    </label>
                                                    <div className="relative mb-4">
                                                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black ${adminSubtleTextClass}`}>{plan.currency}</span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={String(plan.monthlyAmount)}
                                                            onChange={(e) => handleEmployerPlanAmountChange(plan.key, e.target.value)}
                                                            className="w-full bg-card border border-border rounded-xl pl-14 pr-4 py-3 text-sm text-foreground font-bold focus:outline-none focus:border-primary/40 transition-colors"
                                                        />
                                                    </div>

                                                    <label className={`block text-[11px] font-bold uppercase tracking-[0.18em] mb-2 ${adminSubtleTextClass}`}>
                                                        Yearly Discount %
                                                    </label>
                                                    <div className="relative mb-4">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={String(plan.yearlyDiscountPercent)}
                                                            onChange={(e) => handleEmployerYearlyDiscountChange(plan.key, e.target.value)}
                                                            className="w-full bg-card border border-border rounded-xl px-4 pr-10 py-3 text-sm text-foreground font-bold focus:outline-none focus:border-primary/40 transition-colors"
                                                        />
                                                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black ${adminSubtleTextClass}`}>%</span>
                                                    </div>

                                                    <ul className="space-y-2">
                                                        {plan.features.map((feature) => (
                                                            <li key={feature} className={`flex items-start gap-2 text-sm ${adminSecondaryTextClass}`}>
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                                                <span>{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Additional tabs (employers, candidates, etc.) will be implemented in the next steps */}
                        {["employers", "candidates"].includes(activeTab) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {activeTab === "candidates" && (
                                    <div className="flex justify-end mb-4">
                                        <button
                                            type="button"
                                            onClick={handleDownloadAllResumes}
                                            disabled={isDownloadingAllResumes}
                                            className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isDownloadingAllResumes ? "Preparing ZIP..." : "Download All Resume"}
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-4 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-card border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:border-[#FF7A00]/50 transition-colors"
                                    />
                                    <select
                                        className={`bg-card border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none ${adminMutedTextClass}`}
                                        value={userSuspendFilter}
                                        onChange={(e) => setUserSuspendFilter(e.target.value)}
                                    >
                                        <option value="">All Users</option>
                                        <option value="active">Active Users</option>
                                        <option value="suspended">Suspended Users</option>
                                    </select>
                                </div>

                                <div className={`rounded-xl border overflow-hidden ${adminSurfaceClass}`}>
                                    <table className="w-full text-left block md:table">
                                        <thead className="hidden md:table-header-group">
                                            <tr className={`text-[13px] font-medium font-bold uppercase tracking-widest ${adminTableHeadClass}`}>
                                                <th className="px-5 py-3">User Details</th>
                                                <th className="px-5 py-3">Status & Trust</th>
                                                <th className="px-5 py-3">Activity</th>
                                                <th className="px-5 py-3 text-right">Actions Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`block md:table-row-group ${isLightMode ? "divide-y divide-slate-200" : "divide-y divide-white/5"}`}>
                                            {(activeTab === "employers" ? employerUsers : candidateUsers).map((u: any) => (
                                                <tr key={u.id} className={`${adminTableRowClass} transition-colors group flex flex-col md:table-row p-4 md:p-0`}>
                                                    <td className="md:px-5 md:py-3 flex flex-col gap-1 mb-2 md:mb-0">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">User Details</div>
                                                        <p className="text-sm font-bold">{u.name}</p>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </td>
                                                    <td className="md:px-5 md:py-3 flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0 md:py-3">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Status & Trust</div>
                                                        <div className="flex gap-2">
                                                            {u.verified_employer && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[13px] font-medium font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">Verified</span>}
                                                            {u.is_recommended && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[13px] font-medium font-bold rounded-lg border border-amber-500/20 flex items-center gap-1">Recommended</span>}
                                                            {u.is_suspended && <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[13px] font-medium font-bold rounded-lg border border-red-500/20">Suspended</span>}
                                                        </div>
                                                    </td>
                                                    <td className="md:px-5 md:py-3 flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0 md:py-3">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Activity</div>
                                                        <p className="text-[13px] font-medium text-gray-500">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className={`md:px-5 md:py-3 text-right flex justify-between items-center md:table-cell py-2 mt-4 pt-4 md:mt-0 md:border-t-0 md:pt-4 ${isLightMode ? "border-t border-slate-200" : "border-t border-white/5"}`}>
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Actions Control</div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {activeTab === "candidates" && (
                                                                <>
                                                                    <button onClick={() => handleViewCandidate(u.id)} className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-colors ${adminGhostButtonClass}`}>
                                                                        View
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadCandidateResume(u)}
                                                                        disabled={!u.resume_url || u.resume_url === "No resume provided"}
                                                                        className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-colors ${!u.resume_url || u.resume_url === "No resume provided"
                                                                            ? isLightMode
                                                                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                                                                : "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed"
                                                                            : adminGhostButtonClass
                                                                            }`}
                                                                    >
                                                                        Download Resume
                                                                    </button>
                                                                </>
                                                            )}
                                                            {activeTab === "employers" && (
                                                                <>
                                                                    <button onClick={() => handleUserAction(u.id, u.verified_employer ? "unverify_employer" : "verify_employer")} className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-colors ${adminGhostButtonClass}`}>
                                                                        {u.verified_employer ? "Remove Tick" : "Verify"}
                                                                    </button>
                                                                    <button onClick={() => handleUserAction(u.id, u.is_recommended ? "unrecommend" : "is_recommended")} className={`p-1.5 border rounded-lg transition-colors ${isLightMode ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"} ${u.is_recommended ? 'text-amber-500 shadow-lg' : isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button onClick={() => handleUserAction(u.id, u.is_suspended ? "unsuspend" : "is_suspended")} className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-colors ${u.is_suspended ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"}`}>
                                                                {u.is_suspended ? "Restore" : "Suspend"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "jobs" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex gap-4 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Search jobs or companies..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-card border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:border-[#FF7A00]/50 transition-colors"
                                    />
                                    <select
                                        className={`bg-card border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none ${adminMutedTextClass}`}
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="">All Status</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="PAUSED">Paused</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>

                                <div className={`rounded-xl border overflow-hidden ${adminSurfaceClass}`}>
                                    <table className="w-full text-left block md:table">
                                        <thead className="hidden md:table-header-group">
                                            <tr className={`text-[13px] font-medium font-bold uppercase tracking-widest ${adminTableHeadClass}`}>
                                                <th className="px-5 py-3">Job Details</th>
                                                <th className="px-5 py-3">Company</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Moderation Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`block md:table-row-group ${isLightMode ? "divide-y divide-slate-200" : "divide-y divide-white/5"}`}>
                                            {jobs.map((j) => (
                                                <tr key={j.id} className={`${adminTableRowClass} transition-colors flex flex-col md:table-row p-4 md:p-0`}>
                                                    <td className="md:px-5 md:py-3 flex flex-col gap-1 mb-2 md:mb-0">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Job Details</div>
                                                        <p className="text-sm font-bold">{j.job_title}</p>
                                                        <p className="text-xs text-gray-500">{j.city}, {j.country}</p>
                                                    </td>
                                                    <td className={`md:px-5 md:py-3 text-sm flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0 md:py-3 ${adminMutedTextClass}`}>
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Company</div>
                                                        <span>{j.company_name}</span>
                                                    </td>
                                                    <td className="md:px-5 md:py-3 flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0 md:py-3">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Status</div>
                                                        <span className={`px-2 py-1 text-[13px] font-medium font-bold rounded-lg border ${j.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                            j.status === "PAUSED" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                                                isLightMode ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-gray-500/10 border-white/5 text-gray-500"
                                                            }`}>{j.status}</span>
                                                    </td>
                                                    <td className={`md:px-5 md:py-3 text-right flex justify-between items-center md:table-cell py-2 mt-4 pt-4 md:mt-0 md:border-t-0 md:pt-4 ${isLightMode ? "border-t border-slate-200" : "border-t border-white/5"}`}>
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Moderation Actions</div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {j.status !== "ACTIVE" && (
                                                                <button onClick={() => handleJobAction(j.id, "approve")} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-bold hover:bg-emerald-500/20 transition-colors">Approve</button>
                                                            )}
                                                            {j.status === "ACTIVE" && (
                                                                <button onClick={() => handleJobAction(j.id, "hide")} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[11px] font-bold hover:bg-amber-500/20 transition-colors">Hide</button>
                                                            )}
                                                            <button onClick={() => handleJobAction(j.id, "delete")} className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title="Delete">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "verification" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className={`rounded-xl border overflow-hidden ${adminSurfaceClass}`}>
                                    <table className="w-full text-left block md:table">
                                        <thead className="hidden md:table-header-group">
                                            <tr className={`text-[13px] font-medium font-bold uppercase tracking-widest ${adminTableHeadClass}`}>
                                                <th className="px-5 py-3">Employer</th>
                                                <th className="px-5 py-3">Current Status</th>
                                                <th className="px-5 py-3 text-right">Trust Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`block md:table-row-group ${isLightMode ? "divide-y divide-slate-200" : "divide-y divide-white/5"}`}>
                                            {verificationEmployers.map((u: any) => (
                                                <tr key={u.id} className={`${adminTableRowClass} transition-colors flex flex-col md:table-row p-4 md:p-0`}>
                                                    <td className="md:px-5 md:py-3 flex flex-col gap-1 mb-2 md:mb-0">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Employer</div>
                                                        <p className="text-sm font-bold">{u.name}</p>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </td>
                                                    <td className="md:px-5 md:py-3 flex justify-between items-center md:table-cell py-2 mb-2 md:mb-0 md:py-3">
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Current Status</div>
                                                        <div className="flex gap-2">
                                                            {u.verified_employer ? (
                                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[13px] font-medium font-bold rounded-lg border border-emerald-500/20">Verified Company</span>
                                                            ) : (
                                                                <span className={`px-3 py-1 text-[13px] font-medium font-bold rounded-lg border ${isLightMode ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-white/5 text-gray-500 border-white/5"}`}>Unverified</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={`md:px-5 md:py-3 text-right flex justify-between items-center md:table-cell py-2 mt-4 pt-4 md:mt-0 md:border-t-0 md:pt-4 ${isLightMode ? "border-t border-slate-200" : "border-t border-white/5"}`}>
                                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider md:hidden">Trust Control</div>
                                                        <button
                                                            onClick={() => handleUserAction(u.id, u.verified_employer ? "unverify_employer" : "verify_employer", "verification")}
                                                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${u.verified_employer ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/10 hover:bg-emerald-400"}`}
                                                        >
                                                            {u.verified_employer ? "Revoke Verification" : "Approve Verification"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "reports" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className={`flex gap-2 mb-8 p-1.5 rounded-xl border w-fit ${adminSurfaceClass}`}>
                                    {["pending", "resolved", "dismissed"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setReportFilter(s)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${reportFilter === s ? "bg-[#FF7A00] text-black" : isLightMode ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-gray-500 hover:text-white"}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid gap-4">
                                    {reports.map((r) => {
                                        const companyName = getReportCompanyName(r);
                                        const reportSourceType = getReportSourceType(r);

                                        return (
                                            <div key={r.id} className="bg-card border border-border rounded-xl p-5 hover:border-white/10 transition-all">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={() => openReportDetails(r)}
                                                        className="flex items-center gap-4 text-left group"
                                                    >
                                                        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-xl text-red-500">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                        </div>
                                                        <div>
                                                            <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${adminSubtleTextClass}`}>Company Name</p>
                                                            <h4 className={`text-base font-bold group-hover:text-primary transition-colors ${adminStrongTextClass}`}>{companyName}</h4>
                                                            <p className={`text-[11px] font-bold mt-1 uppercase tracking-wider ${adminSubtleTextClass}`}>{reportSourceType}</p>
                                                        </div>
                                                    </button>
                                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase ${adminSoftSurfaceClass} ${adminMutedTextClass}`}>{r.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {reports.length === 0 && (
                                        <div className="bg-card border border-border rounded-xl p-20 text-center">
                                            <p className="text-gray-500 text-sm font-medium">No {reportFilter} reports to show.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "newsletter" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                                    <div className="bg-card rounded-xl border border-border p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Newsletter Studio</p>
                                                <h3 className={`text-xl font-bold ${adminStrongTextClass}`}>Write and send platform updates</h3>
                                                <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>Draft a title and content, preview it live, and send the newsletter to all subscribed emails.</p>
                                            </div>
                                            <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border ${adminSoftSurfaceClass}`}>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${adminSubtleTextClass}`}>Subscribers</p>
                                                    <p className={`text-lg font-bold ${adminStrongTextClass}`}>{newsletterSubscribers.length}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSendNewsletter} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className={`text-xs font-black uppercase tracking-widest ${adminSubtleTextClass}`}>Newsletter Title</label>
                                                <input
                                                    type="text"
                                                    value={newsletterTitle}
                                                    onChange={(e) => setNewsletterTitle(e.target.value)}
                                                    placeholder="Enter the newsletter title"
                                                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${isLightMode ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00]" : "bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF7A00]"}`}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className={`text-xs font-black uppercase tracking-widest ${adminSubtleTextClass}`}>Newsletter Content</label>
                                                <textarea
                                                    value={newsletterContent}
                                                    onChange={(e) => setNewsletterContent(e.target.value)}
                                                    placeholder="Write your newsletter or blog content here..."
                                                    rows={12}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors resize-y ${isLightMode ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00]" : "bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF7A00]"}`}
                                                />
                                            </div>

                                            {newsletterSendSummary && (
                                                <div className={`rounded-2xl border px-4 py-3 text-sm ${newsletterSendSummary.failedCount ? "border-amber-500/20 bg-amber-500/10 text-amber-500" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"}`}>
                                                    <p className="font-semibold">{newsletterSendSummary.message}</p>
                                                    {(typeof newsletterSendSummary.successCount === "number" || typeof newsletterSendSummary.failedCount === "number") && (
                                                        <p className="text-xs mt-1 opacity-80">
                                                            Delivered: {newsletterSendSummary.successCount ?? 0} | Failed: {newsletterSendSummary.failedCount ?? 0}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <p className={`text-xs ${adminSubtleTextClass}`}>The send action uses the existing backend email delivery configuration already active in the project.</p>
                                                <button
                                                    type="submit"
                                                    disabled={isSendingNewsletter || !newsletterTitle.trim() || !newsletterContent.trim() || newsletterSubscribers.length === 0}
                                                    className="px-5 py-3 rounded-2xl bg-[#FF7A00] text-black text-sm font-black uppercase tracking-wide hover:bg-orange-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    {isSendingNewsletter ? "Sending..." : "Send Newsletter"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-card rounded-xl border border-border p-5">
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Live Preview</p>
                                            <div className={`rounded-[1.5rem] border px-5 py-4 min-h-[220px] ${adminSubtleSurfaceClass}`}>
                                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${adminSubtleTextClass}`}>Talorix Newsletter</p>
                                                <h4 className={`text-xl font-bold mt-2.5 ${adminStrongTextClass}`}>
                                                    {newsletterTitle.trim() || "Your newsletter title will appear here"}
                                                </h4>
                                                <div className={`mt-4 space-y-3 text-sm leading-6 whitespace-pre-wrap ${adminSecondaryTextClass}`}>
                                                    {newsletterContent.trim() || "Start writing to preview your newsletter content."}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-card rounded-xl border border-border p-6">
                                            <div className="flex items-center justify-between gap-3 mb-5">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Subscriber List</p>
                                                    <h4 className={`text-lg font-bold ${adminStrongTextClass}`}>All subscribed emails</h4>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${adminSoftSurfaceClass} ${adminSecondaryTextClass}`}>
                                                    {newsletterSubscribers.length} total
                                                </span>
                                            </div>

                                            {isLoadingNewsletterSubscribers ? (
                                                <div className={`rounded-2xl border p-5 text-sm ${adminSubtleSurfaceClass} ${adminMutedTextClass}`}>
                                                    Loading newsletter subscribers...
                                                </div>
                                            ) : newsletterSubscribers.length === 0 ? (
                                                <div className={`rounded-2xl border p-5 text-sm ${adminSubtleSurfaceClass} ${adminMutedTextClass}`}>
                                                    No newsletter subscribers found yet.
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {newsletterSubscribers.map((subscriber: any, index: number) => (
                                                        <div key={subscriber.id} className={`rounded-2xl border px-4 py-3 ${adminSubtleSurfaceClass}`}>
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <p className={`text-sm font-bold break-all ${adminStrongTextClass}`}>{subscriber.email}</p>
                                                                    <p className={`text-xs mt-1 ${adminSubtleTextClass}`}>
                                                                        Subscribed on {new Date(subscriber.created_at).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${adminMutedTextClass}`}>#{index + 1}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "settings" && mounted && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8 max-w-4xl"
                            >
                                <div className={`rounded-[2.5rem] border p-8 md:p-12 relative overflow-hidden ${adminSurfaceClass}`}>
                                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                        <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16z" /></svg>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="mb-10">
                                            <h2 className={`text-2xl font-semibold font-heading tracking-tight ${adminStrongTextClass}`}>Interface Appearance</h2>
                                            <p className={`text-sm mt-2 ${adminSubtleTextClass}`}>Customize how the Talorix Admin Node looks and feels across your devices.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { id: "light", name: "Light Mode", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>, desc: "Clean & crisp high-contrast mode" },
                                                { id: "dark", name: "Dark Mode", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>, desc: "Subtle & professional low-light mode" },
                                                { id: "system", name: "System Sync", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, desc: "Follows your OS preferences" },
                                            ].map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id)}
                                                    className={`p-6 rounded-2xl border transition-all duration-300 text-left group relative ${theme === t.id
                                                        ? "bg-[#FF7A00]/10 border-[#FF7A00] shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                                                        : isLightMode ? "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white" : "bg-[#0A0A0A] border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-500 group-hover:scale-110 ${theme === t.id ? "bg-[#FF7A00] text-black shadow-lg" : isLightMode ? "bg-slate-100 text-slate-500 opacity-80 group-hover:opacity-100" : "bg-white/5 text-gray-400 opacity-60 group-hover:opacity-100"
                                                        }`}>
                                                        {t.icon}
                                                    </div>
                                                    <h4 className={`text-sm font-bold mb-1 ${theme === t.id ? "text-[#FF7A00]" : adminStrongTextClass}`}>{t.name}</h4>
                                                    <p className={`text-[12px] leading-relaxed ${adminSubtleTextClass}`}>{t.desc}</p>

                                                    {theme === t.id && (
                                                        <div className="absolute top-4 right-4 text-[#FF7A00]">
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className={`mt-12 pt-10 ${isLightMode ? "border-t border-slate-200" : "border-t border-white/5"}`}>
                                            <div className={`flex items-center gap-4 p-4 rounded-xl border max-w-lg ${adminSoftSurfaceClass}`}>
                                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <p className={`text-[12px] font-medium ${adminMutedTextClass}`}>
                                                    Dark mode is recommended for prolonged administrative sessions to reduce ocular strain and power consumption.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-[2.5rem] border relative overflow-hidden group ${adminSurfaceClass}`}>
                                    <button
                                        type="button"
                                        onClick={handleToggleMoreSettings}
                                        className="w-full flex items-center justify-between gap-6 p-8 text-left"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center filter grayscale group-hover:grayscale-0 transition-all duration-700 ${isLightMode ? "bg-slate-100" : "bg-white/5"}`}>
                                                <svg className={`w-8 h-8 ${adminMutedTextClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-bold ${adminStrongTextClass}`}>More Settings</h3>
                                                <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>Manage the super admin login email and password from this section.</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-transform duration-300 ${adminGhostButtonClass} ${isMoreSettingsOpen ? "rotate-180" : ""}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isMoreSettingsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                                className="overflow-hidden"
                                            >
                                                <div className={`px-8 pb-8 pt-2 ${isLightMode ? "border-t border-slate-200" : "border-t border-white/5"}`}>
                                                    {isLoadingSuperAdminSettings ? (
                                                        <div className={`rounded-2xl border p-5 text-sm ${adminSubtleSurfaceClass} ${adminMutedTextClass}`}>
                                                            Loading super admin settings...
                                                        </div>
                                                    ) : (
                                                        <form onSubmit={handleSaveSuperAdminSettings} className="space-y-5">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                <div className="space-y-2 md:col-span-2">
                                                                    <label className={`text-xs font-black uppercase tracking-widest ${adminSubtleTextClass}`}>
                                                                        Super Admin ID / Email
                                                                    </label>
                                                                    <input
                                                                        type="email"
                                                                        value={superAdminEmail}
                                                                        onChange={(e) => setSuperAdminEmail(e.target.value)}
                                                                        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${isLightMode ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00]" : "bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF7A00]"}`}
                                                                        placeholder="Enter super admin email"
                                                                        autoComplete="email"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className={`text-xs font-black uppercase tracking-widest ${adminSubtleTextClass}`}>
                                                                        New Password
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showSuperAdminPassword ? "text" : "password"}
                                                                            value={superAdminPassword}
                                                                            onChange={(e) => setSuperAdminPassword(e.target.value)}
                                                                            className={`w-full rounded-2xl border px-4 pr-12 py-3 text-sm outline-none transition-colors ${isLightMode ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00]" : "bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF7A00]"}`}
                                                                            placeholder="Leave blank to keep current password"
                                                                            autoComplete="new-password"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowSuperAdminPassword((prev) => !prev)}
                                                                            className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${adminMutedTextClass} ${isLightMode ? "hover:text-slate-900" : "hover:text-white"}`}
                                                                            aria-label={showSuperAdminPassword ? "Hide password" : "Show password"}
                                                                        >
                                                                            {renderPasswordVisibilityIcon(showSuperAdminPassword)}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className={`text-xs font-black uppercase tracking-widest ${adminSubtleTextClass}`}>
                                                                        Confirm Password
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showSuperAdminConfirmPassword ? "text" : "password"}
                                                                            value={superAdminConfirmPassword}
                                                                            onChange={(e) => setSuperAdminConfirmPassword(e.target.value)}
                                                                            className={`w-full rounded-2xl border px-4 pr-12 py-3 text-sm outline-none transition-colors ${isLightMode ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00]" : "bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF7A00]"}`}
                                                                            placeholder="Confirm new password"
                                                                            autoComplete="new-password"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowSuperAdminConfirmPassword((prev) => !prev)}
                                                                            className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${adminMutedTextClass} ${isLightMode ? "hover:text-slate-900" : "hover:text-white"}`}
                                                                            aria-label={showSuperAdminConfirmPassword ? "Hide password" : "Show password"}
                                                                        >
                                                                            {renderPasswordVisibilityIcon(showSuperAdminConfirmPassword)}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                                <p className={`text-xs ${adminSubtleTextClass}`}>
                                                                    Password updates follow the existing minimum 6-character validation.
                                                                </p>
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSavingSuperAdminSettings}
                                                                    className="px-5 py-3 rounded-2xl bg-[#FF7A00] text-black text-sm font-black uppercase tracking-wide hover:bg-orange-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    {isSavingSuperAdminSettings ? "Saving..." : "Save Credentials"}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            {/* Report Details Modal */}
            <AnimatePresence>
                {isReportDetailsOpen && selectedReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={adminModalOverlayClass}
                            onClick={() => setIsReportDetailsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card border border-border rounded-[2rem] w-full max-w-3xl max-h-[90vh] relative z-10 shadow-2xl overflow-hidden"
                        >
                            <div className={`flex items-start justify-between gap-4 p-6 ${isLightMode ? "border-b border-slate-200" : "border-b border-white/5"}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Report Details</p>
                                    <h2 className={`text-xl font-bold ${adminStrongTextClass}`}>{getReportCompanyName(selectedReport)}</h2>
                                    <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>{getReportSenderEmail(selectedReport)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportDetailsOpen(false)}
                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${adminGhostButtonClass}`}
                                    aria-label="Close report details"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-104px)] space-y-6">
                                <section className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {renderDetailField("Report Type", getReportSourceType(selectedReport))}
                                        {renderDetailField("Company Name", getReportCompanyName(selectedReport))}
                                        {renderDetailField("Sender Email", getReportSenderEmail(selectedReport))}
                                        {renderDetailField("Report Status", selectedReport.status)}
                                        {renderDetailField("Date / Time", getReportDate(selectedReport))}
                                        {!selectedReportIsContactMessage && renderDetailField("Reason", selectedReport.reason)}
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Submitted Message</h3>
                                    <div className={`rounded-2xl border p-5 ${adminSubtleSurfaceClass}`}>
                                        <p className={`text-sm leading-7 whitespace-pre-wrap break-words ${adminStrongTextClass}`}>{getReportMessage(selectedReport)}</p>
                                    </div>
                                </section>

                                {selectedReport.status === "pending" && (
                                    <section className="space-y-3">
                                        <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Actions</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleReportAction(selectedReport.id, "resolve")}
                                                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                            >
                                                Resolve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReportAction(selectedReport.id, "dismiss")}
                                                className={`px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${adminGhostButtonClass}`}
                                            >
                                                Dismiss
                                            </button>
                                            {!selectedReportIsContactMessage && selectedReport.job_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleReportAction(selectedReport.id, "remove_job")}
                                                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors"
                                                >
                                                    Remove Job
                                                </button>
                                            )}
                                            {!selectedReportIsContactMessage && selectedReport.reported_user_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleReportAction(selectedReport.id, "suspend_user")}
                                                    className="px-4 py-2 bg-red-500 border border-red-600 text-black rounded-xl text-xs font-bold hover:bg-red-400 transition-colors"
                                                >
                                                    Suspend Account
                                                </button>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Candidate Details Modal */}
            <AnimatePresence>
                {isCandidateDetailsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={adminModalOverlayClass}
                            onClick={() => setIsCandidateDetailsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card border border-border rounded-[2rem] w-full max-w-5xl max-h-[90vh] relative z-10 shadow-2xl overflow-hidden"
                        >
                            <div className={`flex items-start justify-between gap-4 p-6 ${isLightMode ? "border-b border-slate-200" : "border-b border-white/5"}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Candidate Details</p>
                                    <h2 className={`text-xl font-bold ${adminStrongTextClass}`}>{candidateDetails?.name || "Loading candidate..."}</h2>
                                    <p className={`text-sm mt-1 ${adminSubtleTextClass}`}>{candidateDetails?.email || "Fetching complete profile data"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCandidateDetailsOpen(false)}
                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${adminGhostButtonClass}`}
                                    aria-label="Close candidate details"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-104px)]">
                                {isLoadingCandidateDetails ? (
                                    <div className="py-20 flex flex-col items-center gap-4 text-gray-500">
                                        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
                                        <p className="text-sm font-medium">Loading candidate details...</p>
                                    </div>
                                ) : candidateDetails ? (
                                    <div className="space-y-6">
                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Personal & Contact</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {renderDetailField("Full Name", candidateDetails.name)}
                                                {renderDetailField("Email", candidateDetails.email)}
                                                {renderDetailField("Phone", candidateDetails.phone)}
                                                {renderDetailField("Gender", candidateDetails.gender)}
                                                {renderDetailField("Location", [candidateDetails.city, candidateDetails.state, candidateDetails.country].filter(Boolean).join(", "))}
                                                {renderDetailField("Joined", formatDetailDate(candidateDetails.created_at))}
                                                {renderDetailField("Open To Work", candidateDetails.open_to_work)}
                                                {renderDetailField("Availability", candidateDetails.availability_status)}
                                                {renderDetailField("Available In Days", candidateDetails.available_in_days)}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Profile & Resume</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {renderDetailField("Headline", candidateDetails.headline)}
                                                {renderDetailField("Current Job Title", candidateDetails.current_job_title)}
                                                {renderDetailField("Current Company", candidateDetails.current_company)}
                                                {renderDetailField("Total Experience", candidateDetails.total_experience)}
                                                {renderDetailField("Expected Salary", candidateDetails.expected_salary)}
                                                {renderDetailField("Preferred Location", candidateDetails.preferred_location)}
                                            </div>
                                            {renderDetailField("Bio", candidateDetails.bio)}
                                            <div className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${adminSubtleTextClass}`}>Profile Image</p>
                                                {candidateDetails.avatar_url ? (
                                                    <a href={candidateDetails.avatar_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline break-all">
                                                        Open profile image
                                                    </a>
                                                ) : (
                                                    <p className={`text-sm font-semibold ${adminStrongTextClass}`}>Not provided</p>
                                                )}
                                            </div>
                                            <div className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${adminSubtleTextClass}`}>Resume</p>
                                                {candidateDetails.resume_url ? (
                                                    <a href={candidateDetails.resume_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline break-all">
                                                        Open resume/profile file
                                                    </a>
                                                ) : (
                                                    <p className={`text-sm font-semibold ${adminStrongTextClass}`}>Not provided</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Skills & Portfolio</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {renderDetailList("Skills", candidateDetails.skills)}
                                                {renderDetailList("Experience", candidateDetails.experience)}
                                                {renderDetailList("Education", candidateDetails.education)}
                                                {renderDetailList("Certifications", candidateDetails.certifications)}
                                                {renderDetailList("Projects", candidateDetails.projects)}
                                                {renderDetailList("Portfolio Links", candidateDetails.portfolio_links)}
                                                {renderDetailList("Social Links", candidateDetails.social_links)}
                                                {renderDetailList("AI Feedback Summary", candidateDetails.ai_feedback_summary)}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Activity & Analytics</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                {renderDetailField("Applications", candidateDetails._count?.applications ?? 0)}
                                                {renderDetailField("Interviews", candidateDetails._count?.candidateInterviews ?? 0)}
                                                {renderDetailField("Interview Attempts", candidateDetails._count?.interviewAttempts ?? 0)}
                                                {renderDetailField("Profile Views", candidateDetails.profile_views)}
                                                {renderDetailField("AI Rank", candidateDetails.ai_rank)}
                                                {renderDetailField("AI Percentile", candidateDetails.ai_percentile)}
                                                {renderDetailField("AI Confidence", candidateDetails.ai_confidence_score)}
                                                {renderDetailField("Concept Coverage", candidateDetails.ai_concept_coverage)}
                                                {renderDetailField("Skill Rank", candidateDetails.skill_rank)}
                                                {renderDetailField("Skill Percentile", candidateDetails.skill_percentile)}
                                                {renderDetailField("Verified", candidateDetails.is_verified)}
                                                {renderDetailField("Suspended", candidateDetails.is_suspended)}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Applications</h3>
                                            {candidateDetails.applications?.length ? (
                                                <div className="space-y-3">
                                                    {candidateDetails.applications.map((application: any) => (
                                                        <div key={application.id} className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                                <div>
                                                                    <p className={`text-sm font-bold ${adminStrongTextClass}`}>{application.job?.job_title || "Unknown job"}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">{application.job?.company_name || "Unknown company"} - {[application.job?.city, application.job?.state, application.job?.country].filter(Boolean).join(", ") || "Location not provided"}</p>
                                                                </div>
                                                                <span className={`px-2 py-1 rounded-lg text-[11px] font-bold self-start border ${adminSoftSurfaceClass} ${adminSecondaryTextClass}`}>{application.application_status}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                                                {renderDetailField("Applied At", formatDetailDate(application.applied_at))}
                                                                {renderDetailField("Applicant Phone", application.phone)}
                                                                {renderDetailField("Applicant Address", application.address)}
                                                            </div>
                                                            {application.resume_url && (
                                                                <a href={application.resume_url} target="_blank" rel="noreferrer" className="inline-flex mt-3 text-xs font-bold text-primary hover:underline break-all">
                                                                    Open submitted resume
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`rounded-xl border p-4 text-sm font-semibold ${adminSubtleSurfaceClass} ${adminStrongTextClass}`}>No applications found.</div>
                                            )}
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Interviews</h3>
                                            {candidateDetails.candidateInterviews?.length ? (
                                                <div className="space-y-3">
                                                    {candidateDetails.candidateInterviews.map((interview: any) => (
                                                        <div key={interview.id} className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                                <div>
                                                                    <p className={`text-sm font-bold ${adminStrongTextClass}`}>{interview.job?.job_title || "Unknown job"}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">{interview.job?.company_name || "Unknown company"} - {formatDetailDate(interview.scheduled_time)}</p>
                                                                </div>
                                                                <span className={`px-2 py-1 rounded-lg text-[11px] font-bold self-start border ${adminSoftSurfaceClass} ${adminSecondaryTextClass}`}>{interview.status}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                                                {renderDetailField("Interview Type", interview.interview_type)}
                                                                {renderDetailField("Employer", interview.employer?.name)}
                                                                {renderDetailField("Meeting Link", interview.meeting_link)}
                                                                {renderDetailField("Notes", interview.notes)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`rounded-xl border p-4 text-sm font-semibold ${adminSubtleSurfaceClass} ${adminStrongTextClass}`}>No interviews found.</div>
                                            )}
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className={`text-sm font-black uppercase tracking-widest ${adminMutedTextClass}`}>Interview Attempts</h3>
                                            {candidateDetails.interviewAttempts?.length ? (
                                                <div className="space-y-3">
                                                    {candidateDetails.interviewAttempts.map((attempt: any) => (
                                                        <div key={attempt.id} className={`rounded-xl border p-4 ${adminSubtleSurfaceClass}`}>
                                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                                <div>
                                                                    <p className={`text-sm font-bold ${adminStrongTextClass}`}>{attempt.role_tested_for || attempt.job?.job_title || "Interview attempt"}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">{attempt.job?.company_name || "No linked company"} - {formatDetailDate(attempt.created_at)}</p>
                                                                </div>
                                                                <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[11px] font-bold text-primary self-start">Score {attempt.score}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                                                {renderDetailField("Communication", attempt.communication_score)}
                                                                {renderDetailField("Adaptability", attempt.adaptability_score)}
                                                                {renderDetailField("Technical", attempt.technical_score)}
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                                                {renderDetailList("Feedback", attempt.feedback)}
                                                                {renderDetailList("Keyword Matches", attempt.keyword_matches)}
                                                                {renderDetailField("AI Feedback", attempt.ai_feedback)}
                                                                {renderDetailField("Transcript", attempt.transcript)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`rounded-xl border p-4 text-sm font-semibold ${adminSubtleSurfaceClass} ${adminStrongTextClass}`}>No interview attempts found.</div>
                                            )}
                                        </section>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-sm text-gray-500">Candidate details are unavailable.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
