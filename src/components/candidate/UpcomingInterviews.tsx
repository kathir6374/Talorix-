"use client";

import { useEffect, useState } from "react";

interface Interview {
    id: string;
    scheduled_time: string;
    meeting_link: string;
    interview_type: string;
    notes: string | null;
    status: string;
    job: { job_title: string; company_name: string };
    employer: { name: string; company_logo_url: string | null };
}

export function UpcomingInterviews() {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

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

    useEffect(() => {
        async function fetchInterviews() {
            try {
                const res = await fetch("/api/interviews");
                if (res.ok) {
                    const data = await res.json();
                    const visibleInterviews = (data.interviews || []).filter((interview: Interview) =>
                        interview.status === "Scheduled"
                    );
                    setInterviews(visibleInterviews);
                }
            } catch (err) {
                console.error("Failed to fetch interviews:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInterviews();
    }, []);

    const cancelInterview = async (interviewId: string) => {
        const interviewToRestore = interviews.find((interview) => interview.id === interviewId);
        if (!interviewToRestore || cancelingId) return;

        setCancelingId(interviewId);
        setInterviews((current) => current.filter((interview) => interview.id !== interviewId));

        try {
            const res = await fetch("/api/interviews", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interviewId, status: "Cancelled" }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to cancel interview.");
            }
        } catch (err) {
            console.error("Failed to cancel interview:", err);
            setInterviews((current) =>
                [...current, interviewToRestore].sort(
                    (a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
                )
            );
            alert(err instanceof Error ? err.message : "Failed to cancel interview.");
        } finally {
            setCancelingId(null);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
                        <div className="h-3 w-40 bg-muted rounded mb-2" />
                        <div className="h-2 w-24 bg-muted/70 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (interviews.length === 0) return null;

    return (
        <section className="mb-8">
            <h2 className="text-base font-semibold text-foreground tracking-tight mb-4 flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                Upcoming Interviews
                <span className="ml-auto text-xs font-semibold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">{interviews.length}</span>
            </h2>

            <div className="space-y-3">
                {interviews.map((interview) => {
                    const dt = new Date(interview.scheduled_time);
                    const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                    const isToday = new Date().toDateString() === dt.toDateString();

                    return (
                        <div
                            key={interview.id}
                            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-300 group"
                        >
                            <div className="flex items-start gap-3">
                                {/* Company Logo */}
                                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                    {interview.employer.company_logo_url ? (
                                        <img src={fixGoogleDriveUrl(interview.employer.company_logo_url)!} alt="Logo" className="w-full h-full object-contain p-1.5" loading="lazy" decoding="async" />
                                    ) : (
                                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-semibold text-foreground truncate">{interview.job.job_title}</h3>
                                        {isToday && (
                                            <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full tracking-wider">Today</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium">{interview.job.company_name}</p>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 font-semibold">
                                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {dateStr}, {timeStr}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {interview.interview_type === "Online" && (
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            )}
                                            {interview.interview_type === "Phone" && (
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            )}
                                            {interview.interview_type === "Onsite" && (
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4-14h1v1h-1V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-4-4v4h2v-4h-2z" /></svg>
                                            )}
                                            {interview.interview_type}
                                        </span>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="shrink-0 ml-auto flex flex-col sm:flex-row gap-2">
                                    {interview.meeting_link && (
                                        <>
                                            {interview.interview_type === "Online" && (
                                                <a
                                                    href={interview.meeting_link.startsWith("http") ? interview.meeting_link : `https://${interview.meeting_link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Join
                                                </a>
                                            )}
                                            {interview.interview_type === "Phone" && (
                                                <a
                                                    href={`tel:${interview.meeting_link.replace(/[^\d+]/g, "")}`}
                                                    className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    Call
                                                </a>
                                            )}
                                            {interview.interview_type === "Onsite" && (
                                                <a
                                                    href={interview.meeting_link.startsWith("http") ? interview.meeting_link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interview.meeting_link)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Map
                                                </a>
                                            )}
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => cancelInterview(interview.id)}
                                        disabled={cancelingId === interview.id}
                                        className="bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {cancelingId === interview.id ? "Cancelling" : "Cancel"}
                                    </button>
                                </div>
                            </div>

                            {interview.notes && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                        <span className="font-semibold text-muted-foreground">Note:</span> {interview.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
