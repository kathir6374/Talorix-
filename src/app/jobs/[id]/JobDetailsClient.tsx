"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CandidateBottomNav } from "@/components/CandidateBottomNav";
import { clearPendingJobApplication, savePendingJobApplication } from "@/lib/pending-job-application";

export default function JobDetailsClient({ id: jobId }: { id: string }) {
    const router = useRouter();
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

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [existingApplicationStatus, setExistingApplicationStatus] = useState<string | null>(null);

    // Apply Modal State
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [resumePendingApply, setResumePendingApply] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [applicantName, setApplicantName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [applicantSkills, setApplicantSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportDescription, setReportDescription] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportMsg, setReportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        setResumePendingApply(new URLSearchParams(window.location.search).get("apply") === "1");
    }, []);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch Job
                const res = await fetch(`/api/jobs/${jobId}`);
                const data = await res.json();
                if (data.job) {
                    setJob(data.job);
                }
                if (data.viewerApplication?.application_status) {
                    setExistingApplicationStatus(data.viewerApplication.application_status);
                } else {
                    setExistingApplicationStatus(null);
                }

                // Fetch Profile for Apply Modal
                const profileRes = await fetch("/api/profile");
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUserRole(profileData.user.role);
                    setApplicantName(profileData.user.name || "");
                    setPhone(profileData.user.phone || "");
                    
                    if (profileData.user.skills) {
                        try {
                            const parsedSkills = Array.isArray(profileData.user.skills) ? profileData.user.skills : JSON.parse(profileData.user.skills);
                            setApplicantSkills(Array.isArray(parsedSkills) ? parsedSkills : []);
                        } catch (e) { console.error("Error parsing skills"); }
                    }

                    if (profileData.user.role === 'candidate') {
                        // Check bookmark status
                        const bmRes = await fetch("/api/bookmarks");
                        const bmData = await bmRes.json();
                        if (bmData.bookmarks) {
                            setBookmarked(bmData.bookmarks.some((b: any) => b.job_id === jobId));
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching job details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (jobId) fetchDetails();
    }, [jobId]);

    useEffect(() => {
        if (userRole !== "candidate" || !resumePendingApply) return;

        setShowApplyModal(true);
        setResumePendingApply(false);
        clearPendingJobApplication();

        if (typeof window !== "undefined") {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("apply");
            const nextQuery = currentUrl.searchParams.toString();
            const nextUrl = `${currentUrl.pathname}${nextQuery ? `?${nextQuery}` : ""}${currentUrl.hash}`;
            window.history.replaceState(window.history.state, "", nextUrl);
        }
    }, [resumePendingApply, userRole]);

    const redirectToCandidateLoginForApply = () => {
        savePendingJobApplication(jobId);
        router.push("/login");
    };

    const toggleBookmark = async () => {
        try {
            const res = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });
            const data = await res.json();
            if (res.ok) {
                setBookmarked(data.bookmarked);
            }
        } catch (err) { console.error(err); }
    };

    const handleApply = async () => {
        if (existingApplicationStatus) {
            setMessage({ type: "error", text: "You have already applied for this job." });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append("job_id", jobId);
            formData.append("applicant_name", applicantName);
            formData.append("phone", phone);
            formData.append("address", address);
            if (resumeFile) {
                formData.append("resume", resumeFile);
            }
            formData.append("skills", JSON.stringify(applicantSkills));

            const res = await fetch("/api/apply", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (res.status === 401) {
                setShowApplyModal(false);
                redirectToCandidateLoginForApply();
                return;
            }

            if (res.ok) {
                setExistingApplicationStatus(data.application?.application_status || "applied");
                setMessage({ type: "success", text: "Application submitted successfully!" });
                setTimeout(() => {
                    setShowApplyModal(false);
                    setResumeFile(null);
                    setMessage(null);
                    router.refresh();
                }, 2000);
            } else {
                if (res.status === 409) {
                    setExistingApplicationStatus(data.application?.application_status || "applied");
                }
                setMessage({ type: "error", text: data.error || "Failed to apply." });
            }
        } catch {
            setMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const hasApplied = !!existingApplicationStatus;

    const handleReportJob = async () => {
        if (!reportReason) return;
        setReportSubmitting(true);
        setReportMsg(null);
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId, reason: reportReason, description: reportDescription }),
            });
            const data = await res.json();
            if (res.ok) {
                setReportMsg({ type: "success", text: "Report submitted. Thank you for helping us keep the platform safe." });
                setTimeout(() => { setShowReportModal(false); setReportReason(""); setReportDescription(""); setReportMsg(null); }, 2500);
            } else {
                setReportMsg({ type: "error", text: data.error || "Failed to submit report." });
            }
        } catch {
            setReportMsg({ type: "error", text: "Network error." });
        } finally {
            setReportSubmitting(false);
        }
    };

    const jobUrl = typeof window !== 'undefined' ? window.location.href : '';

    const handleCopyLink = () => {
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(jobUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWhatsAppShare = () => {
        const text = `Check out this job opening: ${job?.job_title || 'New Job'} at ${job?.company_name || 'Talorix'}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`, '_blank');
    };

    const handleLinkedInShare = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin h-10 w-10 border-4 border-[#F59E0B] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">Job Not Found</h1>
                <p className="text-muted-foreground mb-8">The job you are looking for does not exist or has been removed.</p>
                <Link href="/jobs" className="bg-[#F59E0B] text-foreground px-6 py-3 rounded-xl font-bold hover:bg-[#F59E0B]/90 transition-colors duration-300">
                    Back to Jobs
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background overflow-x-hidden transition-colors duration-300">
            {/* Header Banner */}
            <div className="relative pt-24 pb-16 overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/20">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#F59E0B]/20 to-pink-500/10 blur-[120px] pointer-events-none z-0 rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 to-purple-500/10 blur-[100px] pointer-events-none z-0 rounded-full"></div>
                
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans mt-4">
                    <Link href="/jobs" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-all duration-300 mb-8 bg-background/50 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-border hover:border-[#F59E0B]/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] group">
                        <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Search
                    </Link>

                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                        <div className="flex items-center gap-6 group">
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-gradient-to-br from-[#F59E0B]/50 to-pink-500/30 p-[2px] shrink-0 shadow-xl shadow-[#F59E0B]/10 rotate-3 group-hover:rotate-0 transition-all duration-500 overflow-hidden">
                                <div className="w-full h-full rounded-[1.8rem] bg-background flex items-center justify-center text-4xl font-black text-foreground overflow-hidden relative">
                                    {job.employer?.company_logo_url ? (
                                        <img src={fixGoogleDriveUrl(job.employer.company_logo_url)!} alt="Company Logo" className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                                    ) : job.employer?.avatar_url ? (
                                        <img src={fixGoogleDriveUrl(job.employer.avatar_url)!} alt="Company Logo" className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                                    ) : job.company_name.charAt(0)}
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-4xl font-black text-foreground tracking-tight mb-2 leading-tight">
                                    {job.job_title}
                                </h1>
                                <div className="flex items-center flex-wrap gap-2">
                                    <Link href={`/company/${job.posted_by}`} className="text-lg sm:text-xl text-[#F59E0B] hover:text-[#F59E0B]/80 font-bold transition-colors duration-300">
                                        {job.company_name}
                                    </Link>
                                    {job.employer?.verified_employer && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#F59E0B]/20 to-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 shadow-sm shadow-[#F59E0B]/10">
                                            Verified
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center flex-wrap gap-3 mt-4 text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                                    <span className="flex items-center bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                        <svg className="w-4 h-4 mr-1.5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recently'}
                                    </span>
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${job.status === "ACTIVE" ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : job.status === "PAUSED" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                        {job.status || 'ACTIVE'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                            {userRole !== 'employer' && (
                                <button
                                    onClick={() => {
                                        if (job.external_apply_url) {
                                            window.open(job.external_apply_url, '_blank', 'noopener,noreferrer');
                                        } else if (hasApplied) {
                                            setMessage({ type: "error", text: "You have already applied for this job." });
                                        } else if (userRole === "candidate") {
                                            setShowApplyModal(true);
                                        } else {
                                            redirectToCandidateLoginForApply();
                                        }
                                    }}
                                    disabled={job.status !== "ACTIVE" || hasApplied}
                                    className="w-full md:w-auto px-8 py-4 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-foreground font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none gap-2"
                                >
                                    {job.status !== "ACTIVE" ? (
                                        "Currently Not Accepting Applications"
                                    ) : hasApplied ? (
                                        "Already Applied"
                                    ) : (
                                        <>
                                            {job.external_apply_url ? "Apply on Company Site" : "Apply Now"}
                                            {job.external_apply_url && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            )}
                                        </>
                                    )}
                                </button>
                            )}
                            {userRole === 'candidate' && (
                                <button
                                    onClick={toggleBookmark}
                                    className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold transition-all border flex items-center justify-center ${bookmarked ? 'bg-transparent border-[#F59E0B] text-[#F59E0B]' : 'bg-muted border-border text-foreground hover:bg-muted'}`}
                                >
                                    <svg className="w-5 h-5 mr-2" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                    {bookmarked ? "Saved" : "Save Job"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Left Column: Job Description & Details */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Key Attributes Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group">
                                <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Work Model</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">{job.work_model}</p>
                                </div>
                            </div>
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Job Type</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">{job.job_type}</p>
                                </div>
                            </div>
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Experience</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">{job.experience_min} - {job.experience_max} yrs</p>
                                </div>
                            </div>
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group">
                                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Openings</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">{job.openings}</p>
                                </div>
                            </div>
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group md:col-span-2">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Salary Range ({job.currency || 'USD'})</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">
                                        {(job.salary_min || 0).toLocaleString()} - {(job.salary_max || 0).toLocaleString()}
                                        <span className="text-muted-foreground text-xs font-normal ml-1">/ {(job.salary_type || 'Year').toLowerCase()}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="h-full glass hover:bg-muted/50 transition-colors duration-300 border border-border rounded-2xl p-5 flex items-start gap-4 group md:col-span-3 lg:col-span-1">
                                <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Location</h3>
                                    <p className="text-foreground font-semibold truncate text-sm">
                                        {job.city || "Various"}{job.state ? `, ${job.state}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <section>
                            <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-6 border-b border-border pb-3">About the Role</h2>
                            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-muted-foreground leading-relaxed">
                                {(job.job_description || "No description provided.").split('\n').map((paragraph: string, idx: number) => (
                                    <p key={idx} className="mb-4">{paragraph}</p>
                                ))}
                            </div>
                        </section>

                        {(job.benefits?.length > 0 || job.required_skills?.length > 0) && (
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {job.required_skills?.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground mb-4">Required Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {job.required_skills.map((skill: string, i: number) => (
                                                <span key={i} className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-lg text-sm font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {job.benefits?.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground mb-4">Benefits</h3>
                                        <ul className="space-y-2">
                                            {job.benefits.map((benefit: string, i: number) => (
                                                <li key={i} className="flex items-start text-muted-foreground">
                                                    <svg className="w-5 h-5 text-green-500 mr-2 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    {benefit}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* Right Column: Company & Sidebar Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Summary Card */}
                        <div className="glass border border-border rounded-3xl p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-foreground mb-4">Summary</h3>

                            <ul className="space-y-4 mb-8">
                                <li className="flex flex-col">
                                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Category</span>
                                    <span className="text-foreground font-medium">{job.job_category}</span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Education Required</span>
                                    <span className="text-foreground font-medium">{job.education_level}</span>
                                </li>
                                {job.shift_type && (
                                    <li className="flex flex-col">
                                        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Shift</span>
                                        <span className="text-foreground font-medium">{job.shift_type}</span>
                                    </li>
                                )}
                                {job.application_deadline && (
                                    <li className="flex flex-col">
                                        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Deadline</span>
                                        <span className="text-foreground font-medium">{new Date(job.application_deadline).toLocaleDateString()}</span>
                                    </li>
                                )}
                            </ul>

                            {/* Share Job */}
                            <div className="pt-4 border-t border-border mt-4 mb-4">
                                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3 block">Share this role</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/30 hover:text-[#F59E0B] transition-all"
                                        title="Copy Link"
                                    >
                                        {copied ? (
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleWhatsAppShare}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:bg-[#25D366]/10 hover:border-[#25D366]/30 hover:text-[#25D366] transition-all"
                                        title="Share on WhatsApp"
                                    >
                                        <svg className="w-4 h-4 fill-current m-[1px]" viewBox="0 0 24 24"><path d="M12.031 21.05c-1.353 0-2.673-.364-3.834-1.049l-.271-.16-2.822.738.75-2.737-.179-.283A8.91 8.91 0 014.288 12.1c0-4.943 4.025-8.968 8.972-8.968 2.396 0 4.646.934 6.34 2.628a8.97 8.97 0 012.628 6.34c.001 4.945-4.026 8.95-8.966 8.95H12.031zm-5.717-3.418c1.071.635 2.34 1.058 3.717 1.058 4.062 0 7.373-3.311 7.373-7.373 0-1.97-.768-3.821-2.16-5.215a7.373 7.373 0 00-5.213-2.158c-4.061 0-7.372 3.312-7.372 7.374 0 1.344.348 2.592.956 3.666l-.504 1.838 1.956-.513z" /><path d="M16.143 14.502c-.227-.114-1.343-.663-1.551-.74-.208-.076-.358-.114-.51.114-.152.227-.585.74-.717.89-.133.152-.266.17-.492.057a6.205 6.205 0 01-1.821-1.123 6.818 6.818 0 01-1.258-1.56c-.133-.228-.014-.352.1-.466.102-.102.227-.266.34-.398.114-.133.152-.227.228-.38.076-.151.038-.284-.019-.397-.057-.114-.51-1.23-.699-1.685-.185-.445-.371-.384-.51-.392a4.346 4.346 0 00-.435-.008c-.152 0-.398.057-.606.284-.208.227-.795.776-.795 1.894 0 1.117.814 2.197.928 2.348.114.152 1.6 2.443 3.878 3.425.542.235.966.375 1.296.48.544.172 1.038.148 1.43.09.436-.065 1.343-.55 1.532-1.08.19-.53.19-.985.133-1.08-.057-.095-.208-.152-.435-.266z" /></svg>
                                    </button>
                                    <button
                                        onClick={handleLinkedInShare}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:bg-[#0077b5]/10 hover:border-[#0077b5]/30 hover:text-[#0077b5] transition-all"
                                        title="Share on LinkedIn"
                                    >
                                        <svg className="w-4 h-4 fill-current m-[1px]" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Report Job Button */}
                            {userRole && (
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2.5 rounded-xl border border-border hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/5 transition-all"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                                    Report this job
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-over Apply Panel */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => !submitting && setShowApplyModal(false)}></div>
                    <div className="fixed inset-y-0 right-0 flex max-w-full md:pl-10">
                        <div className="w-screen max-w-full md:max-w-lg transform transition-all duration-300 ease-in-out border-l border-border bg-background shadow-md flex flex-col h-full outline-none overflow-y-auto">

                            {/* Header */}
                            <div className="bg-muted border-b border-border px-6 py-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Applying to</h3>
                                    <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">{job.job_title}</h2>
                                    <p className="text-[#F59E0B] text-xs font-semibold mt-0.5">{job.company_name}</p>
                                </div>
                                <button
                                    onClick={() => !submitting && setShowApplyModal(false)}
                                    className="text-muted-foreground hover:text-foreground bg-muted border border-border hover:bg-muted rounded-full p-2.5 transition-all focus:outline-none"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Form Content */}
                            <div className="px-8 py-8 space-y-8 flex-1">

                                {/* Applicant Info Fields */}
                                <div className="space-y-5 glass p-6 rounded-2xl border border-border">
                                    <h4 className="text-sm font-bold tracking-widest text-[#F59E0B] uppercase">Personal Details</h4>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 opacity-80 uppercase tracking-widest text-[#F59E0B]">Full Name</label>
                                        <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Rahul Sharma" className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F59E0B] transition-colors duration-300" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 opacity-80 uppercase tracking-widest text-[#F59E0B]">Phone Number</label>
                                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F59E0B] transition-colors duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Location</label>
                                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, State" className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F59E0B] transition-colors duration-300" />
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Section */}
                                <div className="space-y-4 glass p-6 rounded-2xl border border-border">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold tracking-widest text-[#F59E0B] uppercase flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Skills
                                        </h4>
                                    </div>

                                    {/* Suggested Skills */}
                                    {job.required_skills && job.required_skills.length > 0 && (
                                        <div className="mb-4">
                                            <span className="text-xs text-muted-foreground font-medium mb-2 block">Match missing requirements:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {job.required_skills.filter((reqSkill: string) => !applicantSkills.some(s => s.toLowerCase() === reqSkill.toLowerCase())).map((reqSkill: string, i: number) => (
                                                    <button
                                                        key={`req-${i}`}
                                                        onClick={(e) => { e.preventDefault(); setApplicantSkills([...applicantSkills, reqSkill]); }}
                                                        className="bg-muted hover:bg-[#F59E0B]/10 border border-border hover:border-[#F59E0B]/50 text-muted-foreground hover:text-[#F59E0B] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-300 flex items-center group cursor-pointer"
                                                    >
                                                        <svg className="w-3 h-3 mr-1 text-muted-foreground group-hover:text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                        {reqSkill}
                                                    </button>
                                                ))}
                                                {job.required_skills.filter((reqSkill: string) => !applicantSkills.some(s => s.toLowerCase() === reqSkill.toLowerCase())).length === 0 && (
                                                    <span className="text-xs text-green-500/80 bg-green-500/10 px-2.5 py-1 rounded border border-green-500/20 font-bold tracking-wide">
                                                        ALL REQUIRED SKILLS MATCHED
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Profile Skills */}
                                    <div className="flex flex-wrap gap-2">
                                        {applicantSkills.map((skill: string, i: number) => (
                                            <span key={i} className="bg-muted text-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center border border-border shadow-sm">
                                                {skill}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setApplicantSkills(applicantSkills.filter((_, index) => index !== i)); }}
                                                    className="ml-2 m-[-2px] p-0.5 text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors duration-300"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add Custom Skill Input */}
                                    <div className="flex mt-3">
                                        <input
                                            type="text"
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (skillInput.trim() && !applicantSkills.includes(skillInput.trim())) {
                                                        setApplicantSkills([...applicantSkills, skillInput.trim()]);
                                                        setSkillInput("");
                                                    }
                                                }
                                            }}
                                            placeholder="Add custom skill (e.g. Photoshop)..."
                                            className="w-full bg-background border border border-border rounded-l-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#F59E0B] transition-colors duration-300 h-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (skillInput.trim() && !applicantSkills.includes(skillInput.trim())) {
                                                    setApplicantSkills([...applicantSkills, skillInput.trim()]);
                                                    setSkillInput("");
                                                }
                                            }}
                                            className="bg-muted hover:bg-[#F59E0B] border-y border-r border-border hover:border-[#F59E0B] text-muted-foreground hover:text-foreground font-bold px-4 rounded-r-xl transition-all h-10"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2">These skills will be saved to your profile</p>
                                </div>

                                {/* File Upload Area */}
                                <div className="glass p-6 rounded-2xl border border-border">
                                    <h4 className="text-sm font-bold tracking-widest text-[#F59E0B] uppercase flex items-center mb-4">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        Resume / CV
                                    </h4>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border border-dashed border-border hover:border-[#F59E0B]/50 rounded-xl p-6 flex flex-col items-center justify-center transition-all group/upload hover:bg-[#F59E0B]/5"
                                    >
                                        {resumeFile ? (
                                            <>
                                                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mb-3">
                                                    <svg className="w-6 h-6 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <p className="text-foreground font-medium text-sm text-center max-w-full truncate px-4">{resumeFile.name}</p>
                                                <p className="text-muted-foreground text-xs mt-1">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB — Click to replace</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-3 group-hover/upload:bg-[#F59E0B]/10 transition-colors duration-300">
                                                    <svg className="w-6 h-6 text-muted-foreground group-hover/upload:text-[#F59E0B] transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                </div>
                                                <p className="text-muted-foreground font-medium text-sm">Upload standard PDF or Word file</p>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Footer Submit */}
                            <div className="bg-muted border-t border-border p-6 shrink-0 z-10 box-border sticky bottom-0">
                                {message && (
                                    <div className={`p-4 rounded-xl text-sm mb-4 flex items-center font-bold shadow-sm ${message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-500"}`}>
                                        {message.text}
                                    </div>
                                )}
                                {hasApplied && (
                                    <div className="p-4 rounded-xl text-sm mb-4 flex items-center font-bold shadow-sm bg-blue-500/10 border border-blue-500/30 text-blue-400">
                                        Your application has already been submitted for this job.
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowApplyModal(false)}
                                        disabled={submitting}
                                        className="flex-1 bg-muted text-foreground hover:bg-muted border border-border font-bold py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleApply}
                                        disabled={submitting || !applicantName.trim() || hasApplied}
                                        className="flex-1 bg-[#F59E0B] text-foreground font-extrabold py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:hover:shadow-none hover:bg-[#F59E0B]/90"
                                    >
                                        {submitting ? "Processing..." : hasApplied ? "Already Applied" : "Submit Application"}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Report Job Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !reportSubmitting && setShowReportModal(false)} />
                    <div className="relative w-full max-w-md glass rounded-3xl p-8 shadow-md border border-border">
                        <button onClick={() => !reportSubmitting && setShowReportModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-xl font-bold text-foreground mb-1">Report this Job</h3>
                        <p className="text-muted-foreground text-sm mb-6">Help us keep the platform safe.</p>

                        <div className="space-y-3 mb-6">
                            {["spam", "misleading", "scam", "inappropriate", "duplicate", "expired", "other"].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReportReason(r)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all border ${reportReason === r
                                        ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                                        : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={reportDescription}
                            onChange={e => setReportDescription(e.target.value)}
                            placeholder="Additional details (optional)"
                            rows={3}
                            className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none mb-4"
                        />

                        {reportMsg && (
                            <div className={`p-3 rounded-xl text-sm mb-4 ${reportMsg.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {reportMsg.text}
                            </div>
                        )}

                        <button
                            onClick={handleReportJob}
                            disabled={!reportReason || reportSubmitting}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {reportSubmitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </div>
            )}
            {userRole === "candidate" && <CandidateBottomNav />}
        </div>
    );
}
