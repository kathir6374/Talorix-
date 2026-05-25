"use client";

import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <h1 className="text-4xl font-extrabold text-foreground mb-8 tracking-tight">Terms of <span className="shimmer-text">Service</span></h1>

                <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 text-muted-foreground leading-relaxed shadow-md">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. Introduction</h2>
                        <p>Welcome to Talorix. By using our platform, you agree to these terms. Please read them carefully. Talorix is a talent discovery and job matching ecosystem designed to connect professionals with industry opportunities.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. User Accounts</h2>
                        <p>You are responsible for maintaining the security of your account and password. You must provide accurate and complete information when creating an account. Any fraudulent or misleading information may lead to account termination.</p>
                        <ul className="list-disc pl-6 mt-4 space-y-2">
                            <li>Candidates must provide truthful professional histories.</li>
                            <li>Employers must post legitimate job opportunities.</li>
                            <li>Users must be at least 18 years of age.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3. Acceptable Use</h2>
                        <p>Users are prohibited from using Talorix for any unlawful activity. This includes, but is not limited to: posting fraudulent jobs, scraping user data, transmitting malware, or harassing other users.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. Intellectual Property</h2>
                        <p>The Talorix brand, logo, and platform design are the exclusive property of Talorix. Users retain ownership of the content they upload (resumes, job descriptions) but grant Talorix a license to host and process this content for the purposes of the platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. Limitation of Liability</h2>
                        <p>Talorix is provided &quot;as is&quot;. We do not guarantee the accuracy of job postings or user profiles. Talorix is not liable for any employment disputes or damages arising from the use of the platform.</p>
                    </section>

                    <section className="pt-8 border-t border-border mt-12 flex justify-between items-center text-sm">
                        <p>Last Updated: February 26, 2026</p>
                        <Link href="/contact" className="text-[#FF7A00] font-bold">Questions? Contact us</Link>
                    </section>
                </div>
            </div>
        </div>
    );
}
