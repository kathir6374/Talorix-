"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import "./homepage.css";

type HomeOverviewData = {
  aiScore: {
    averageScore: number | null;
    communicationScore: number | null;
    technicalScore: number | null;
    totalAttempts: number;
  };
  shortlistedCandidates: Array<{
    id: string;
    name: string;
    role: string;
    score: number | null;
  }>;
  latestInterview: {
    status: string;
    interviewType: string;
    scheduledTime: string;
    candidateName: string;
    jobTitle: string;
  } | null;
};

/* ─────────────── Scroll-triggered section wrapper ─────────────── */
function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────── Floating card component ─────────────── */
function FloatingCard({
  children,
  className = "",
  delay = 0,
  duration = 6,
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      style={style}
      animate={{ y: [0, -12, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────── Storytelling Number Counter ─────────────── */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView || !ref.current) return;
    let start = 0;
    const end = target;
    const duration = 1800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * end);
      if (ref.current) ref.current.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

function formatOneDecimal(value: number | null) {
  return value === null ? "--" : value.toFixed(1);
}

function formatInterviewDate(value: string | null) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getInterviewStatusClass(status: string | null) {
  const normalizedStatus = (status || "").toLowerCase();

  if (normalizedStatus === "completed" || normalizedStatus === "passed") {
    return "hero-card__status hero-card__status--pass";
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "rejected" || normalizedStatus === "scheduled" || normalizedStatus === "rescheduled") {
    return "hero-card__status";
  }

  return "hero-card__status";
}

/* ─────────────── Storytelling Scroll-linked Section ─────────────── */
function StorytellingSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  const stories = [
    {
      stat: "AI",
      headline: "Smarter screening",
      desc: "Instant skill scores out of 10 for every candidate, automatically.",
      accent: "#FF7A00",
    },
    {
      stat: "Fair",
      headline: "Zero bias",
      desc: "Skill-based ranking eliminates name and gender bias entirely.",
      accent: "#FF7A00",
    },
    {
      stat: "Fast",
      headline: "Minute matching",
      desc: "From application to shortlist in under 5 minutes.",
      accent: "#FF7A00",
    },
  ];

  return (
    <section className="storytelling" ref={containerRef} id="story">
      <div className="container">
        <FadeInSection>
          <div className="section__header">
            <span className="section__label">Why Talorix</span>
            <h2 className="section__title">Redefining Recruitment</h2>
          </div>
        </FadeInSection>

        <div className="storytelling__grid">
          {stories.map((s, i) => (
            <StoryCard key={i} story={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story, index }: { story: { stat: string; headline: string; desc: string; accent: string }; index: number }) {
  return (
    <FadeInSection delay={index * 0.1}>
      <div className="story-card story-card--compact">
        <div className="story-card__indicator" style={{ backgroundColor: story.accent }} />
        <div className="story-card__stat text-gradient">{story.stat}</div>
        <h3 className="story-card__headline">{story.headline}</h3>
        <p className="story-card__desc">{story.desc}</p>
      </div>
    </FadeInSection>
  );
}

/* ─────────────── "Built For Everyone" Audience Section ─────────────── */
function AudienceSection() {
  const audiences = [
    {
      tag: "Startups",
      title: "Move fast, hire smart",
      desc: "Small team? No HR department? Talorix gives you enterprise-grade screening without the overhead. Find verified, AI-scored talent ready to join your mission.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      tag: "Freshers",
      title: "Launch your career with confidence",
      desc: "No experience? No problem. Practice with AI interviews, build your score, and let recruiters discover you based on skill, not connections. Your talent speaks for itself.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
        </svg>
      ),
    },
    {
      tag: "Experienced Professionals",
      title: "Showcase what you\'re truly worth",
      desc: "Years of experience deserve a better evaluation than a resume scan. Take the AI interview, prove your expertise with a verified score, and get matched with roles that value your depth.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
  ];

  return (
    <section className="section section--alt" id="audience">
      <div className="container">
        <FadeInSection>
          <div className="section__header">
            <span className="section__label">Built For Everyone</span>
            <h2 className="section__title">One Platform. Every Career Stage.</h2>
            <p className="section__sub">
              Whether you&apos;re a startup hiring your first engineer, a fresher landing your first
              role, or a seasoned professional seeking the next challenge, Talorix levels the playing field.
            </p>
          </div>
        </FadeInSection>

        <div className="audience-grid">
          {audiences.map((a, i) => (
            <FadeInSection key={i} delay={i * 0.12}>
              <div className="audience-card">
                <div className="audience-card__icon">{a.icon}</div>
                <span className="audience-card__tag">{a.tag}</span>
                <h3 className="audience-card__title">{a.title}</h3>
                <p className="audience-card__desc">{a.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Data ─────────────── */
const howItWorksSteps = [
  {
    step: "01",
    title: "Upload & Interview",
    desc: "Candidate uploads resume and takes a structured AI-powered interview.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "AI Analysis",
    desc: "AI analyzes answers, evaluates skills, and generates a score out of 10.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        <path d="M20 12a8 8 0 0 0-8-8v8h8z" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Discover Talent",
    desc: "Recruiters instantly discover and shortlist top-ranked candidates.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const recruiterBenefits = [
  {
    title: "AI-Screened Candidates",
    desc: "Every candidate is pre-vetted by our AI engine.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  },
  {
    title: "Smart Ranking",
    desc: "Candidates ranked by skill-fit and interview score.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>),
  },
  {
    title: "Location Filtering",
    desc: "Find talent by region, remote status, or city.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>),
  },
  {
    title: "Faster Hiring",
    desc: "Reduce time-to-hire with AI pre-screening.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>),
  },
];

const candidateBenefits = [
  {
    title: "Practice Interviews",
    desc: "Sharpen your skills with AI-powered mock sessions.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>),
  },
  {
    title: "Improve Skills",
    desc: "Get actionable feedback to level up your career.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>),
  },
  {
    title: "Get Discovered",
    desc: "Top scores surface you directly to recruiters.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  },
  {
    title: "Receive Feedback",
    desc: "Detailed performance insights after every session.",
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  },
];

const trustItems = [
  { 
    title: "Verified Employers", 
    desc: "Every company on the platform is identity-verified.", 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) 
  },
  { 
    title: "Scam-Free Postings", 
    desc: "AI + manual review ensures only legitimate jobs.", 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) 
  },
  { 
    title: "Fair Evaluation", 
    desc: "Unbiased AI scoring based purely on skill and fit.", 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) 
  },
];

/* ─────────────── Job Search Bar Section ─────────────── */
function JobSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedQuery = query.trim();
    const normalizedLocation = location.trim();
    const params = new URLSearchParams();
    if (normalizedQuery) params.set("search", normalizedQuery);
    if (normalizedLocation) params.set("location", normalizedLocation);
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="job-search-bar-section">
      <div className="container">
        <FadeInSection>
          <div className="job-search-bar-wrapper">
            <p className="job-search-bar__label">Find your next opportunity</p>
            <form onSubmit={handleSearch} className="job-search-bar">
              <div className="job-search-bar__field">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="job-search-bar__icon">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Job title, skills, or keywords..."
                  className="job-search-bar__input"
                  suppressHydrationWarning
                />
              </div>
              <div className="job-search-bar__divider" />
              <div className="job-search-bar__field">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="job-search-bar__icon">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, country, or Remote"
                  className="job-search-bar__input"
                  suppressHydrationWarning
                />
              </div>
              <button type="submit" className="job-search-bar__btn" suppressHydrationWarning>
                Search Jobs
              </button>
            </form>
            <div className="job-search-bar__tags">
              {["Remote", "Full-time", "Engineering", "Design", "Product"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => router.push(`/jobs?search=${tag}`)}
                  className="job-search-bar__tag"
                  suppressHydrationWarning
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────── Featured Jobs Section ─────────────── */
function FeaturedJobsSection() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs?limit=6&status=ACTIVE")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const badgeClass = (model: string) => {
    if (model === "Remote") return "job-card__badge--remote";
    if (model === "Hybrid") return "job-card__badge--hybrid";
    return "job-card__badge--onsite";
  };

  const formatSalary = (min: number, max: number, currency: string) => {
    if (!min && !max) return null;
    const fmt = (n: number) =>
      n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
    return `${currency} ${fmt(min)}${max && max !== min ? ` to ${fmt(max)}` : ""}`;
  };

  return (
    <section className="featured-jobs" id="featured-jobs">
      <div className="container">
        <FadeInSection>
          <div className="section__header">
            <span className="section__label">Open Roles</span>
            <h2 className="section__title">Featured Opportunities</h2>
            <p className="section__sub">
              Handpicked active listings from verified employers. Apply in minutes.
            </p>
          </div>
        </FadeInSection>

        <div className="featured-jobs__grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="job-card job-card--skeleton">
                <div className="job-card__header">
                  <div className="job-skeleton-line" style={{ width: 40, height: 40, borderRadius: 10 }} />
                  <div className="job-skeleton-line" style={{ width: 60, height: 20, borderRadius: 6 }} />
                </div>
                <div className="job-card__body">
                  <div className="job-skeleton-line" style={{ height: 16, width: "80%", marginBottom: 8 }} />
                  <div className="job-skeleton-line" style={{ height: 12, width: "50%" }} />
                </div>
                <div className="job-card__meta">
                  <div className="job-skeleton-line" style={{ height: 22, width: 70, borderRadius: 6 }} />
                  <div className="job-skeleton-line" style={{ height: 22, width: 70, borderRadius: 6 }} />
                </div>
              </div>
            ))
            : jobs.length === 0
              ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: "var(--hp-text-muted)", fontSize: 14 }}>
                  No active jobs yet. Check back soon!
                </div>
              )
              : jobs.map((job, i) => {
                const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
                const location = [job.city, job.state, job.country].filter(Boolean).join(", ");
                return (
                  <FadeInSection key={job.id} delay={i * 0.06}>
                    <Link href={`/jobs/${job.id}`} className="job-card">
                      <div className="job-card__header">
                        <div className="job-card__logo">
                          {job.company_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className={`job-card__badge ${badgeClass(job.work_model)}`}>
                          {job.work_model}
                        </span>
                      </div>
                      <div className="job-card__body">
                        <h3 className="job-card__title">{job.job_title}</h3>
                        <p className="job-card__company">{job.company_name}</p>
                      </div>
                      <div className="job-card__meta">
                        <span className="job-card__pill">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                          </svg>
                          {job.job_type}
                        </span>
                        {location && (
                          <span className="job-card__pill">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {location.length > 22 ? location.slice(0, 22) + "…" : location}
                          </span>
                        )}
                        {salary && <span className="job-card__salary">{salary}</span>}
                      </div>
                    </Link>
                  </FadeInSection>
                );
              })}
        </div>

        {!loading && jobs.length > 0 && (
          <FadeInSection>
            <div className="featured-jobs__cta">
              <Link href="/jobs" className="btn btn--secondary" style={{ display: "inline-flex" }}>
                View All Jobs
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>
          </FadeInSection>
        )}
      </div>
    </section>
  );
}

// Footer is now handled globally by ClientLayout
export default function Home() {
  const router = useRouter();
  const [homeOverview, setHomeOverview] = useState<HomeOverviewData | null>(null);

  const handleTryInterviewClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const cookies = document.cookie.split(";");
    const isLoggedIn = cookies.some((c) => c.trim().startsWith("is_logged_in="));
    if (isLoggedIn) {
      router.push("/candidate/interview-sim/recommend");
    } else {
      router.push("/signup");
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHomeOverview = async () => {
      try {
        const response = await fetch("/api/home/overview", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setHomeOverview(data);
        }
      } catch (error) {
        console.error("Home overview fetch error:", error);
      }
    };

    loadHomeOverview();
    const intervalId = window.setInterval(loadHomeOverview, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="homepage">
      {/* ════════════ HERO ════════════ */}
      <section className="hero">
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
        <div className="hero__grid-bg" />

        <div className="container hero__inner">
          <div className="hero__content">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="hero__badge">AI-Powered Hiring Platform</span>
            </motion.div>

            <motion.h1
              className="hero__title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              Hire AI-Screened <br />
              Talent <span className="text-gradient">Faster</span>
            </motion.h1>

            <motion.p
              className="hero__sub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              Talorix helps startups, freshers, and experienced professionals
              connect through AI-powered interview scoring. Fair, fast, and transparent.
            </motion.p>

            <motion.div
              className="hero__actions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/signup" className="btn btn--primary btn--glow" id="hero-get-started">
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
              <button type="button" onClick={handleTryInterviewClick as any} className="btn btn--secondary" id="hero-try-interview">
                Try AI Interview
              </button>
            </motion.div>
          </div>

          {/* Hero floating cards visual — AI scores out of 10 */}
          <div className="hero__visual">
            <FloatingCard className="hero-card hero-card--score" delay={0} duration={5.5}>
              <div className="hero-card__header">
                <span className="hero-card__dot hero-card__dot--green" />
                <span className="hero-card__label">AI Score</span>
              </div>
              <div className="hero-card__score">
                {formatOneDecimal(homeOverview?.aiScore.averageScore ?? null)}
                <span>/10</span>
              </div>
              <div className="hero-card__bar-track">
                <div
                  className="hero-card__bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, (homeOverview?.aiScore.averageScore ?? 0) * 10))}%` }}
                />
              </div>
              <div className="hero-card__meta">
                <span>Communication: {formatOneDecimal(homeOverview?.aiScore.communicationScore ?? null)}</span>
                <span>Technical: {formatOneDecimal(homeOverview?.aiScore.technicalScore ?? null)}</span>
              </div>
            </FloatingCard>

            <FloatingCard className="hero-card hero-card--shortlist" delay={1.2} duration={6.5}>
              <div className="hero-card__header">
                <span className="hero-card__dot hero-card__dot--orange" />
                <span className="hero-card__label">Shortlist</span>
              </div>
              <div className="hero-card__list">
                {(homeOverview?.shortlistedCandidates.length ?? 0) > 0 ? (
                  homeOverview!.shortlistedCandidates.map((candidate) => (
                    <div key={candidate.id} className="hero-card__list-item">
                      <div className="hero-card__avatar">{getInitials(candidate.name)}</div>
                      <div>
                        <div className="hero-card__name">{candidate.name}</div>
                        <div className="hero-card__role">{candidate.role}</div>
                      </div>
                      <span className="hero-card__tag">
                        {candidate.score !== null ? candidate.score.toFixed(1) : "--"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="hero-card__list-item">
                    <div className="hero-card__avatar">--</div>
                    <div>
                      <div className="hero-card__name">No shortlist yet</div>
                      <div className="hero-card__role">Live shortlisted candidates will appear here.</div>
                    </div>
                    <span className="hero-card__tag">--</span>
                  </div>
                )}
              </div>
            </FloatingCard>

            <FloatingCard className="hero-card hero-card--result" delay={0.6} duration={7}>
              <div className="hero-card__header">
                <span className="hero-card__dot hero-card__dot--blue" />
                <span className="hero-card__label">Interview Result</span>
              </div>
              <div className="hero-card__result-row">
                <span>Status</span>
                <span className={getInterviewStatusClass(homeOverview?.latestInterview?.status || null)}>
                  {homeOverview?.latestInterview?.status || "No Data"}
                </span>
              </div>
              <div className="hero-card__result-row">
                <span>Type</span>
                <span>{homeOverview?.latestInterview?.interviewType || "--"}</span>
              </div>
              <div className="hero-card__result-row">
                <span>Scheduled</span>
                <span>{formatInterviewDate(homeOverview?.latestInterview?.scheduledTime || null)}</span>
              </div>
            </FloatingCard>
          </div>
        </div>
      </section>

      {/* ════════════ JOB SEARCH BAR ════════════ */}
      <JobSearchBar />


      {/* ════════════ STORYTELLING STATS ════════════ */}
      <StorytellingSection />

      {/* ════════════ BUILT FOR EVERYONE ════════════ */}
      <AudienceSection />

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="section" id="how-it-works">
        <div className="container">
          <FadeInSection>
            <div className="section__header">
              <span className="section__label">Process</span>
              <h2 className="section__title">How Talorix Works</h2>
              <p className="section__sub">Three simple steps from application to hire.</p>
            </div>
          </FadeInSection>

          <div className="steps-grid">
            {howItWorksSteps.map((s, i) => (
              <FadeInSection key={i} delay={i * 0.12}>
                <div className="step-card">
                  <div className="step-card__icon">{s.icon}</div>
                  <div className="step-card__step">{s.step}</div>
                  <h3 className="step-card__title">{s.title}</h3>
                  <p className="step-card__desc">{s.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ AI INTERVIEW SECTION ════════════ */}
      <section className="section section--alt" id="ai-interview">
        <div className="container">
          <div className="interview-layout">
            <FadeInSection className="interview-layout__text">
              <span className="section__label">Product</span>
              <h2 className="section__title" style={{ textAlign: "left" }}>AI Interview Simulator</h2>
              <p className="section__sub" style={{ textAlign: "left", maxWidth: "420px" }}>
                Experience a real interview environment with camera preview, timed questions, and instant AI analysis. Scored out of 10 for clarity.
              </p>
              <button type="button" onClick={handleTryInterviewClick as any} className="btn btn--primary btn--glow" id="interview-cta">
                Start Practice Interview
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </button>
            </FadeInSection>

            <FadeInSection delay={0.15} className="interview-layout__preview">
              <div className="interview-ui">
                <div className="interview-ui__camera">
                  <img src="/interview-preview.png" alt="AI Interview Preview" className="interview-ui__camera-img" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} loading="lazy" decoding="async" />
                  <div className="interview-ui__rec">● REC</div>
                </div>

                <div className="interview-ui__controls">
                  <div className="interview-ui__question">
                    <span className="interview-ui__q-num">Q3 / 10</span>
                    <span className="interview-ui__q-text">Describe a recent technical challenge you solved.</span>
                  </div>
                  <div className="interview-ui__bottom">
                    <div className="interview-ui__timer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      01:42
                    </div>
                    <button className="interview-ui__record-btn" suppressHydrationWarning>
                      <span className="interview-ui__record-dot" />
                      Answer
                    </button>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ════════════ RECRUITER BENEFITS ════════════ */}
      <section className="section" id="recruiter-benefits">
        <div className="container">
          <FadeInSection>
            <div className="section__header">
              <span className="section__label">For Recruiters</span>
              <h2 className="section__title">Why Recruiters Love Talorix</h2>
              <p className="section__sub">Pre-screened talent, smarter rankings, faster hires.</p>
            </div>
          </FadeInSection>

          <div className="benefits-grid">
            {recruiterBenefits.map((b, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <div className="benefit-card">
                  <div className="benefit-card__icon">{b.icon}</div>
                  <h3 className="benefit-card__title">{b.title}</h3>
                  <p className="benefit-card__desc">{b.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CANDIDATE BENEFITS ════════════ */}
      <section className="section section--alt" id="candidate-benefits">
        <div className="container">
          <FadeInSection>
            <div className="section__header">
              <span className="section__label">For Candidates</span>
              <h2 className="section__title">Built for Ambitious Candidates</h2>
              <p className="section__sub">Practice, improve, and get discovered by the best startups.</p>
            </div>
          </FadeInSection>

          <div className="benefits-grid">
            {candidateBenefits.map((b, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <div className="benefit-card">
                  <div className="benefit-card__icon">{b.icon}</div>
                  <h3 className="benefit-card__title">{b.title}</h3>
                  <p className="benefit-card__desc">{b.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <FeaturedJobsSection />


      {/* ════════════ TRUST SECTION ════════════ */}
      <section className="section" id="trust">
        <div className="container">
          <FadeInSection>
            <div className="section__header">
              <span className="section__label">Trust & Safety</span>
              <h2 className="section__title">A Platform You Can Trust</h2>
              <p className="section__sub">Verified employers, scam-free postings, and fair AI evaluation.</p>
            </div>
          </FadeInSection>

          <div className="trust-grid">
            {trustItems.map((t, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="trust-card">
                  <div className="trust-card__check">{t.icon}</div>
                  <h3 className="trust-card__title">{t.title}</h3>
                  <p className="trust-card__desc">{t.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="section cta-section" id="cta">
        <div className="cta-section__glow" />
        <div className="container">
          <FadeInSection>
            <div className="cta-box">
              <h2 className="cta-box__title">
                Start Hiring Smarter <br /> with <span className="text-gradient">Talorix</span>
              </h2>
              <p className="cta-box__sub">
                Join hundreds of startups and candidates already using Talorix to transform hiring.
              </p>
              <div className="cta-box__actions">
                <Link href="/signup?role=employer" className="btn btn--primary btn--glow" id="cta-employer">
                  Create Employer Account
                </Link>
                <Link href="/candidate/interview-sim/recommend" className="btn btn--secondary" id="cta-interview">
                  Take AI Interview
                </Link>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
}
