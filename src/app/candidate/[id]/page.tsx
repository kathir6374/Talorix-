import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProfileWhatsAppHero } from "@/components/employer/ProfileWhatsAppHero";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { sendProfileViewEmail } from "@/lib/email";
import { sendWhatsAppProfileView } from "@/lib/whatsapp";
import { BackButton } from "@/components/common/BackButton";
import { getEmployerCandidateAccess } from "@/lib/employer-subscriptions";

const getGmailComposeUrl = (email: string) =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email.trim())}`;

export default async function CandidateProfile({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Get session to check if an employer is viewing
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    let viewerSession = null;
    if (token) {
        viewerSession = await verifyAuth(token.value);
    }

    const candidate = await db.user.findUnique({
        where: { id: id, role: "candidate" },
        select: {
            id: true,
            name: true,
            headline: true,
            bio: true,
            gender: true,
            avatar_url: true,
            skills: true,
            experience: true,
            education: true,
            social_links: true,
            resume_url: true,
            email: true,
            phone: true,
            open_to_work: true,
            certifications: true,
            projects: true,
            portfolio_links: true,
            // @ts-ignore
            interviewAttempts: {
                select: {
                    score: true,
                    // @ts-ignore
                    role_tested_for: true,
                    created_at: true,
                    job_id: true,
                    communication_score: true,
                    technical_score: true,
                    keyword_matches: true,
                },
                orderBy: {
                    score: 'desc'
                }
            }
        }
    });

    if (!candidate) {
        notFound();
    }

    const employerCandidateAccess = viewerSession?.role === "employer"
        ? await getEmployerCandidateAccess(viewerSession.userId, candidate.id)
        : {
            hasExistingRelationship: false,
            canViewProfile: true,
            canAccessContact: true,
        };
    const hasEmployerProfileAccess = employerCandidateAccess.canViewProfile;
    const canAccessCandidateContact = employerCandidateAccess.canAccessContact;
    const showEmployerContactLock = viewerSession?.role === "employer" && !canAccessCandidateContact;

    const getGoogleDriveDirectLink = (url: string | null) => {
        if (!url) return null;
        const fileIdMatch = url.match(/[-\w]{25,}/);
        if (fileIdMatch && (url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com"))) {
            return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}=s1000`;
        }
        return url;
    };

    const avatarUrl = getGoogleDriveDirectLink(candidate.avatar_url);
    const placeholderAvatar = `/avatars/${(candidate.gender || "male").toLowerCase()}.png`;

    if (!hasEmployerProfileAccess) {
        return (
            <div className="min-h-screen bg-background">
                <main className="pt-24 pb-16 px-6 lg:px-10 max-w-3xl mx-auto">
                    <BackButton />

                    <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden mt-6">
                        <div className="p-8 sm:p-10">
                            <div className="flex flex-col sm:flex-row items-start gap-6">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-card shadow-lg bg-primary/10 flex items-center justify-center shrink-0 border border-border">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    ) : (
                                        <img src={placeholderAvatar} alt="Default avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-2">Employer Subscription Required</p>
                                    <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2">{candidate.name}</h1>
                                    <p className="text-muted-foreground font-medium mb-6">{candidate.headline || "Candidate profile access is locked on your current plan."}</p>
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                                        <p className="text-sm text-foreground font-semibold leading-relaxed">
                                            This candidate profile is outside your current employer subscription access.
                                            Upgrade your plan from the Employer Dashboard to unlock direct candidate discovery and profile viewing.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-6">
                                        <Link
                                            href="/employer-dashboard"
                                            className="bg-primary text-black font-bold px-5 py-3 rounded-xl text-sm transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                                        >
                                            Manage Subscription
                                        </Link>
                                        <Link
                                            href="/employer-dashboard?tab=applicants"
                                            className="bg-muted hover:bg-muted/80 text-foreground px-5 py-3 rounded-xl text-sm font-bold transition-all"
                                        >
                                            Back to Applicants
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // TRACK VIEW & ALERT: If an employer is viewing their profile
    if (viewerSession && viewerSession.role === "employer" && viewerSession.userId !== candidate.id) {
        // 1. Increment profile_views in DB
        await db.user.update({
            where: { id: candidate.id },
            data: { profile_views: { increment: 1 } }
        }).catch(() => { });

        // 2. Fetch employer details for the alert
        const employer = await db.user.findUnique({
            where: { id: viewerSession.userId },
            select: { name: true }
        });

        // 3. Send alerts (Async, don't block render)
        const employerName = employer?.name || "An employer";
        if (candidate.email) {
            sendProfileViewEmail(candidate.email, candidate.name || "Candidate", employerName)
                .catch(err => console.error("Profile view email failed:", err));
        }
        if (candidate.phone) {
            sendWhatsAppProfileView(candidate.phone, candidate.name || "Candidate", employerName)
                .catch(err => console.error("Profile view WhatsApp failed:", err));
        }
    }

    const skills = Array.isArray(candidate.skills) ? (candidate.skills as string[]) : [];
    const experience = Array.isArray(candidate.experience) ? (candidate.experience as any[]) : [];
    const education = Array.isArray(candidate.education) ? candidate.education : [];
    const certifications = Array.isArray(candidate.certifications) ? (candidate.certifications as any[]) : [];
    const projects = Array.isArray(candidate.projects) ? (candidate.projects as any[]) : [];
    const portfolioLinks = Array.isArray(candidate.portfolio_links) ? (candidate.portfolio_links as string[]) : [];
    const socialLinks = candidate.social_links as any || {};

    return (
        <div className="min-h-screen bg-background">
            <main className="pt-24 pb-16 px-6 lg:px-10 max-w-5xl mx-auto">

                {/* Header Profile Card */}
                <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden mb-8 relative pt-8">
                    <ProfileWhatsAppHero candidate={{ ...candidate, phone: canAccessCandidateContact ? candidate.phone : null }} />

                    <div className="px-8 pb-8">
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-card shadow-lg bg-primary/10 flex items-center justify-center shrink-0 border border-border">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    <img src={placeholderAvatar} alt="Default avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                )}
                            </div>
{/* ... truncated for instructions, but I will provide full replacement below ... */}

                            {/* Info */}
                            <div className="flex-1 pt-2 sm:pt-14">
                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                    <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{candidate.name}</h1>
                                    {candidate.open_to_work && (
                                        <span className="bg-primary/10 text-primary text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-primary/20">
                                            Open to Work
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground font-medium mb-5">{candidate.headline || "Seeking new opportunities"}</p>

                                <div className="flex flex-wrap gap-3">
                                    {candidate.resume_url && candidate.resume_url !== "No resume provided" && canAccessCandidateContact && (
                                        <a
                                            href={`/api/candidates/${candidate.id}/resume`}
                                            target="_blank"
                                            className="bg-primary hover:shadow-[0_6px_16px_-4px_rgba(255,122,0,0.4)] text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                            Download Resume
                                        </a>
                                    )}

                                    {canAccessCandidateContact ? (
                                        <a
                                            href={getGmailComposeUrl(candidate.email)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-muted hover:bg-muted/80 text-foreground px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            Send Email
                                        </a>
                                    ) : null}
                                </div>

                                {showEmployerContactLock && (
                                    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                        <p className="text-sm font-semibold text-foreground leading-relaxed">
                                            This sourced candidate profile is visible on your current plan, but direct contact details and resume access are unlocked on higher employer plans.
                                        </p>
                                        <Link
                                            href="/employer-dashboard?tab=talent"
                                            className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-black transition-all hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]"
                                        >
                                            Upgrade Contact Access
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Bio */}
                        {candidate.bio && (
                            <section className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                                <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    </div>
                                    About
                                </h2>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm font-medium">{candidate.bio}</p>
                            </section>
                        )}

                        {/* Experience */}
                        {experience.length > 0 && (
                            <section className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                                <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </div>
                                    Work Experience
                                </h2>
                                <div className="space-y-6">
                                    {experience.map((exp: any, index: number) => (
                                        <div key={index} className="relative pl-6 border-l-2 border-primary/20">
                                            <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 shadow-sm"></div>
                                            <h3 className="font-black text-foreground text-base">{exp.title}</h3>
                                            <p className="text-primary font-bold text-sm mb-1">{exp.company}</p>
                                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">{exp.startDate} — {exp.current ? "Present" : exp.endDate}</p>
                                            {exp.description && <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Education */}
                        {education.length > 0 && (
                            <section className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                                <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5v4m0 0v-4m0 4h-4m4 0h4"></path></svg>
                                    </div>
                                    Education
                                </h2>
                                <div className="space-y-6">
                                    {education.map((edu: any, index: number) => (
                                        <div key={index} className="relative pl-6 border-l-2 border-border">
                                            <div className="absolute w-3 h-3 bg-border border-2 border-muted-foreground/30 rounded-full -left-[7px] top-1.5"></div>
                                            <h3 className="font-black text-foreground text-base">{edu.school}</h3>
                                            <p className="text-foreground/80 font-bold text-sm mb-1">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Graduated: {edu.graduationYear}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Certifications */}
                        {certifications.length > 0 && (
                            <section className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                                <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    </div>
                                    Certifications
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {certifications.map((cert: any, index: number) => (
                                        <div key={index} className="p-4 rounded-xl bg-muted/40 border border-border flex items-start gap-3">
                                            <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                                            <div>
                                                <p className="font-black text-foreground text-sm leading-tight">{cert.name || cert.title}</p>
                                                <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mt-1">{cert.issuer || cert.organization}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Projects / Portfolio */}
                        {(projects.length > 0 || portfolioLinks.length > 0) && (
                            <section className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                                <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </div>
                                    Work Samples & Portfolio
                                </h2>
                                <div className="space-y-4">
                                    {portfolioLinks.map((link: string, index: number) => (
                                        <a key={index} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" className="flex items-center p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-all group">
                                            <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center mr-4 border border-border group-hover:bg-primary/5 transition-colors"><svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-foreground truncate">{link.replace(/^https?:\/\//, '')}</p>
                                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">External Portfolio Link</p>
                                            </div>
                                            <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    ))}
                                    {projects.map((project: any, index: number) => (
                                        <div key={index} className="p-5 rounded-2xl bg-muted/20 border border-border">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-foreground text-base">{project.title || project.name}</h4>
                                                {project.link && (
                                                    <a href={project.link.startsWith('http') ? project.link : `https://${project.link}`} target="_blank" className="text-primary hover:underline"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>
                                                )}
                                            </div>
                                            {project.description && <p className="text-muted-foreground text-sm leading-relaxed mb-3">{project.description}</p>}
                                            {project.technologies && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(Array.isArray(project.technologies) ? project.technologies : project.technologies.split(',')).map((tech: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-background border border-border px-2 py-0.5 rounded font-black text-muted-foreground uppercase">{tech.trim()}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* AI Assessments */}
                        {/* @ts-ignore */}
                        {candidate.interviewAttempts && candidate.interviewAttempts.length > 0 && (
                            <section className="bg-card border text-foreground rounded-2xl p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 rounded-2xl to-blue-600/10 opacity-100 transition-opacity"></div>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                                <div className="relative z-10">
                                    <h2 className="text-lg font-black mb-5 md:mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        AI Recommended Scores
                                    </h2>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-5">
                                        {/* @ts-ignore */}
                                        {candidate.interviewAttempts.map((attempt: any, index: number) => (
                                            <div key={index} className="h-full bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4 md:p-5 flex flex-col gap-4 hover:bg-muted transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                    <div>
                                                        <h3 className="font-black text-foreground text-sm md:text-base mb-1 leading-tight">
                                                            {attempt.role_tested_for || "Technical Assesment"}
                                                        </h3>
                                                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                                            {new Date(attempt.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="self-start bg-primary text-white px-3.5 py-1.5 rounded-xl text-lg md:text-xl font-black shadow-lg shadow-black/10">
                                                        {attempt.score}<span className="text-white/50 text-base">/10</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-border">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Communication</p>
                                                        <p className="text-foreground font-black">{attempt.communication_score || Math.ceil(attempt.score / 2)}<span className="text-muted-foreground text-xs font-bold">/5</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Technical Skills</p>
                                                        <p className="text-foreground font-black">{attempt.technical_score || Math.floor(attempt.score / 2)}<span className="text-muted-foreground text-xs font-bold">/5</span></p>
                                                    </div>
                                                </div>

                                                {attempt.keyword_matches && (
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Technical Keywords Matched</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {attempt.keyword_matches.matched?.map((kw: string, i: number) => (
                                                                <span key={i} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                                    {kw} <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                </span>
                                                            ))}
                                                            {attempt.keyword_matches.missed?.map((kw: string, i: number) => (
                                                                <span key={i} className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 opacity-70">
                                                                    {kw} <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground text-xs mt-4 font-medium">These scores are generated objectively by our AI. The technical score leverages Natural Language Processing to detect job-specific technical keywords directly relevant to the target role, avoiding subjective human bias.</p>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Skills */}
                        {skills.length > 0 && (
                            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-black text-foreground mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"></path></svg>
                                    Skills
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill: string, index: number) => (
                                        <span key={index} className="bg-muted text-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-bold">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Social Links */}
                        {(socialLinks.linkedin || socialLinks.github || socialLinks.portfolio) && (
                            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-black text-foreground mb-4">Links</h2>
                                <div className="space-y-2">
                                    {socialLinks.linkedin && (
                                        <a href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://${socialLinks.linkedin}`} target="_blank" className="flex items-center p-3 rounded-xl hover:bg-muted transition-colors group">
                                            <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                            </div>
                                            <span className="text-foreground font-bold text-sm group-hover:text-[#0A66C2] transition-colors">LinkedIn</span>
                                        </a>
                                    )}
                                    {socialLinks.github && (
                                        <a href={socialLinks.github.startsWith('http') ? socialLinks.github : `https://${socialLinks.github}`} target="_blank" className="flex items-center p-3 rounded-xl hover:bg-muted transition-colors group">
                                            <div className="w-9 h-9 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                                            </div>
                                            <span className="text-foreground font-bold text-sm group-hover:text-primary transition-colors">GitHub</span>
                                        </a>
                                    )}
                                    {socialLinks.portfolio && (
                                        <a href={socialLinks.portfolio.startsWith('http') ? socialLinks.portfolio : `https://${socialLinks.portfolio}`} target="_blank" className="flex items-center p-3 rounded-xl hover:bg-muted transition-colors group">
                                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                            </div>
                                            <span className="text-foreground font-bold text-sm group-hover:text-emerald-600 transition-colors">Portfolio</span>
                                        </a>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Back Button */}
                        <BackButton className="flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-primary transition-colors px-2" />
                    </div>
                </div>
            </main>
        </div>
    );
}
