"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LocationSelector } from "@/components/LocationDropdown";

export default function PostJobPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#FF7A00] border-t-transparent rounded-full"></div></div>}>
            <PostJobContent />
        </Suspense>
    );
}

function PostJobContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editJobId = searchParams.get("edit");

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!editJobId);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        job_title: "",
        company_name: "",
        job_category: "Engineering",
        job_type: "Full-time",
        work_model: "Remote",
        country: "",
        state: "",
        city: "",
        salary_type: "Yearly",
        salary_min: "",
        salary_max: "",
        currency: "USD",
        experience_min: "",
        experience_max: "",
        education_level: "Bachelor's",
        required_skills: "",
        openings: "1",
        shift_type: "Day",
        benefits: "",
        application_deadline: "",
        hr_contact_name: "",
        hr_contact_phone: "",
        job_description: "",
        external_apply_url: "",
        search_keywords: "",
        ai_interview_questions: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        if (!editJobId) return;

        async function fetchJob() {
            try {
                const res = await fetch(`/api/jobs/${editJobId}`);
                if (!res.ok) throw new Error("Failed to fetch job details");
                const data = await res.json();
                const job = data.job;

                setFormData({
                    job_title: job.job_title || "",
                    company_name: job.company_name || "",
                    job_category: job.job_category || "Engineering",
                    job_type: job.job_type || "Full-time",
                    work_model: job.work_model || "Remote",
                    country: job.country || "",
                    state: job.state || "",
                    city: job.city || "",
                    salary_type: job.salary_type || "Yearly",
                    salary_min: job.salary_min?.toString() || "",
                    salary_max: job.salary_max?.toString() || "",
                    currency: job.currency || "USD",
                    experience_min: job.experience_min?.toString() || "",
                    experience_max: job.experience_max?.toString() || "",
                    education_level: job.education_level || "Bachelor's",
                    required_skills: Array.isArray(job.required_skills) ? job.required_skills.join(", ") : "",
                    openings: job.openings?.toString() || "1",
                    shift_type: job.shift_type || "Day",
                    benefits: Array.isArray(job.benefits) ? job.benefits.join(", ") : "",
                    application_deadline: job.application_deadline ? new Date(job.application_deadline).toISOString().split('T')[0] : "",
                    hr_contact_name: job.hr_contact_name || "",
                    hr_contact_phone: job.hr_contact_phone || "",
                    job_description: job.job_description || "",
                    external_apply_url: job.external_apply_url || "",
                    search_keywords: Array.isArray(job.search_keywords) ? job.search_keywords.join(", ") : "",
                    ai_interview_questions: Array.isArray(job.ai_interview_questions) ? job.ai_interview_questions.join("\n") : "",
                });
            } catch (err: any) {
                setError("Could not load job for editing.");
            } finally {
                setFetching(false);
            }
        }
        fetchJob();
    }, [editJobId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccessMsg("");

        try {
            const url = editJobId ? `/api/jobs/${editJobId}` : "/api/jobs";
            const method = editJobId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Failed to ${editJobId ? 'update' : 'post'} job`);
            }

            setSuccessMsg(`Job ${editJobId ? 'updated' : 'posted'} successfully!`);
            setTimeout(() => {
                router.push("/employer-dashboard");
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pt-20 sm:pt-24 pb-16 sm:pb-20 transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
                <div className="mb-6 sm:mb-10">
                    <Link href="/employer-dashboard" className="inline-flex items-center text-muted-foreground hover:text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all duration-300 mb-6 sm:mb-8 group bg-card px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-border shadow-sm">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-2.5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </Link>

                    <div className="space-y-1.5 sm:space-y-2">
                        <h1 className="text-2xl sm:text-[32px] font-black text-foreground tracking-tight leading-tight">
                            {editJobId ? 'Modify ' : 'Post a '}
                            <span className="text-primary">
                                {editJobId ? 'Existing Job' : 'New Job Opening'}
                            </span>
                        </h1>
                        <p className="text-secondary text-xs sm:text-sm font-medium max-w-2xl">
                            {editJobId ? 'Update your job listing details to attract the best talent for your team.' : 'Provide comprehensive details about the role to help candidates understand the opportunity.'}
                        </p>
                    </div>
                </div>

                <div className="bg-card rounded-[24px] sm:rounded-[32px] p-5 sm:p-12 border border-border shadow-[0_4px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group/card">
                    {/* Subtle Background Accent */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 group-hover/card:bg-primary/10 transition-colors duration-700"></div>

                    {fetching && (
                        <div className="absolute inset-0 z-50 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-[24px] sm:rounded-[32px]">
                            <div className="animate-spin h-8 w-8 sm:h-10 sm:w-10 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    )}

                    {error && (
                        <div className="relative z-10 bg-red-50 border border-red-100 text-red-600 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-[13px] sm:text-sm mb-8 sm:mb-10 flex items-start animate-in fade-in slide-in-from-top-4">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <span className="font-bold">{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="relative z-10 bg-green-500/10 border border-green-500/20 text-green-500 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-[13px] sm:text-sm mb-8 sm:mb-10 flex items-start animate-in fade-in slide-in-from-top-4">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            <span className="font-bold">{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-10 sm:space-y-12">
                        {/* 1. Basic Information */}
                        <section className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white text-[13px] sm:text-sm font-black">1</span>
                                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Basic Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Job Title *</label>
                                    <input type="text" name="job_title" value={formData.job_title} onChange={handleChange} required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="e.g. Senior Frontend Engineer" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Company Name *</label>
                                    <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Job Category *</label>
                                    <div className="relative">
                                        <select name="job_category" value={formData.job_category} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base appearance-none">
                                            <option value="Engineering">Engineering</option>
                                            <option value="Design">Design</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Sales">Sales</option>
                                            <option value="Product">Product</option>
                                            <option value="Operations">Operations</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Number of Openings</label>
                                    <input type="number" name="openings" value={formData.openings} onChange={handleChange} min="1" className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Employment Type *</label>
                                    <div className="relative">
                                        <select name="job_type" value={formData.job_type} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base appearance-none">
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Internship">Internship</option>
                                            <option value="Freelance">Freelance</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Work Model *</label>
                                    <div className="relative">
                                        <select name="work_model" value={formData.work_model} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base appearance-none">
                                            <option value="Onsite">Onsite</option>
                                            <option value="Remote">Remote</option>
                                            <option value="Hybrid">Hybrid</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-border/50 w-full"></div>

                        {/* 2. Location */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-black">2</span>
                                <h2 className="text-xl font-black text-foreground tracking-tight">Location Details</h2>
                            </div>
                            <LocationSelector
                                values={{ country: formData.country, state: formData.state, city: formData.city }}
                                onChange={(loc) =>
                                    setFormData((prev) => ({ ...prev, country: loc.country, state: loc.state, city: loc.city }))
                                }
                                gridClassName="grid grid-cols-1 md:grid-cols-3 gap-8"
                                variant="default"
                            />
                        </section>

                        <div className="h-px bg-border/50 w-full"></div>

                        {/* 3. Compensation */}
                        <section className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white text-[13px] sm:text-sm font-black">3</span>
                                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Compensation & Benefits</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 sm:gap-8">
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Salary Type</label>
                                    <select name="salary_type" value={formData.salary_type} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base">
                                        <option value="Yearly">Yearly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Hourly">Hourly</option>
                                    </select>
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Min Salary *</label>
                                    <input type="number" name="salary_min" value={formData.salary_min} onChange={handleChange} min="0" required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="e.g. 80000" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Max Salary *</label>
                                    <input type="number" name="salary_max" value={formData.salary_max} onChange={handleChange} min="0" required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="e.g. 120000" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Currency</label>
                                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base">
                                        <option value="USD">USD ($)</option>
                                        <option value="INR">INR (₹)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="CAD">CAD ($)</option>
                                        <option value="AUD">AUD ($)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2 lg:space-y-2.5">
                                <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Benefits (comma-separated)</label>
                                <input type="text" name="benefits" value={formData.benefits} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="Health Insurance, 401k, Remote Work, Gym Membership" />
                            </div>
                        </section>

                        <div className="h-px bg-border/50 w-full"></div>

                        {/* 4. Requirements */}
                        <section className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white text-[13px] sm:text-sm font-black">4</span>
                                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Candidate Requirements</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                                <div className="grid grid-cols-2 gap-4 sm:gap-4">
                                    <div className="space-y-2 lg:space-y-2.5">
                                        <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Min Exp (Y)</label>
                                        <input type="number" name="experience_min" value={formData.experience_min} onChange={handleChange} min="0" required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" />
                                    </div>
                                    <div className="space-y-2 lg:space-y-2.5">
                                        <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Max Exp (Y)</label>
                                        <input type="number" name="experience_max" value={formData.experience_max} onChange={handleChange} min="0" required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" />
                                    </div>
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Education Level</label>
                                    <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base">
                                        <option value="Any">Any</option>
                                        <option value="High School">High School</option>
                                        <option value="Associate">Associate Degree</option>
                                        <option value="Bachelor's">Bachelor&apos;s Degree</option>
                                        <option value="Master's">Master&apos;s Degree</option>
                                        <option value="Doctorate">Doctorate</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Required Skills *</label>
                                    <input type="text" name="required_skills" value={formData.required_skills} onChange={handleChange} required className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="React, Node.js, TypeScript" />
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold ml-1 uppercase">Separate skills with commas</p>
                                </div>
                                <div className="md:col-span-2 space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Search Keywords (Boolean Search)</label>
                                    <input type="text" name="search_keywords" value={formData.search_keywords} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="urgent, night shift, urgent hiring, remote-only" />
                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium ml-1">
                                        Add extra keywords to help candidates find this job. Supports simple comma-separated tags.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-border/50 w-full"></div>

                        {/* 5. Additional Details */}
                        <section className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white text-[13px] sm:text-sm font-black">5</span>
                                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Contact & Description</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">HR Contact Name</label>
                                    <input type="text" name="hr_contact_name" value={formData.hr_contact_name} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="Rahul Sharma" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">HR Contact Phone</label>
                                    <input type="tel" name="hr_contact_phone" value={formData.hr_contact_phone} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base" placeholder="+91 98765 43210" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Application Deadline</label>
                                    <input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium select-none text-sm sm:text-base" />
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Shift Type</label>
                                    <select name="shift_type" value={formData.shift_type} onChange={handleChange} className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base">
                                        <option value="Day">Day Shift</option>
                                        <option value="Night">Night Shift</option>
                                        <option value="Flexible">Flexible</option>
                                        <option value="Rotating">Rotating</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 lg:space-y-2.5">
                                <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Detailed Job Description *</label>
                                <textarea name="job_description" value={formData.job_description} onChange={handleChange} rows={10} required placeholder="Describe the responsibilities, requirements, and why someone should join your team in detail..." className="w-full bg-background border border-border rounded-2xl sm:rounded-3xl px-5 py-4 sm:px-6 sm:py-5 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium resize-none leading-relaxed text-sm sm:text-base" />
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" /></svg>
                                    </div>
                                    <h3 className="text-sm sm:text-base font-bold text-foreground">External Application (Optional)</h3>
                                </div>
                                <div className="space-y-2 lg:space-y-2.5">
                                    <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">External Application URL</label>
                                    <input
                                        type="url"
                                        name="external_apply_url"
                                        value={formData.external_apply_url}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm sm:text-base"
                                        placeholder="https://company.com/careers/apply-here"
                                    />
                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium ml-1">
                                        If provided, the &quot;Apply&quot; button will redirect candidates to this link instead of using the internal application form.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-border/50 w-full"></div>

                        {/* 6. AI Interview & Evaluations */}
                        <section className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white text-[13px] sm:text-sm font-black">6</span>
                                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">AI Interview Simulator Settings</h2>
                            </div>

                            <div className="space-y-2 lg:space-y-2.5">
                                <label className="block text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Custom AI Interview Questions (Optional)</label>
                                <textarea name="ai_interview_questions" value={formData.ai_interview_questions} onChange={handleChange} rows={5} placeholder="1. How do you handle production outages?&#10;2. Explain a complex feature you built.&#10;3. Why do you want to join our specific team?" className="w-full bg-background border border-border rounded-2xl sm:rounded-3xl px-5 py-4 sm:px-6 sm:py-5 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium resize-none leading-relaxed text-sm sm:text-base" />
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium ml-1">
                                    Provide up to 10 specific questions you want the AI to ask candidates. Put each question on a new line. <br />If left blank, the AI will automatically generate relevant questions based on the Job Title and Skills.
                                </p>
                            </div>
                        </section>

                        <div className="pt-8 sm:pt-10 border-t border-border flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto relative group overflow-hidden bg-primary text-white font-black py-4 px-8 sm:px-10 rounded-xl sm:rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_20px_-5px_rgba(255,122,0,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(255,122,0,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span className="relative z-10 flex items-center justify-center text-xs sm:text-sm uppercase tracking-widest">
                                    {loading ? "Processing..." : (editJobId ? "Update Job Posting" : "Publish Job Opening")}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

