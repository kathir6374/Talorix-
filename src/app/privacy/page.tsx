"use client";

import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <h1 className="text-4xl font-extrabold text-foreground mb-8 tracking-tight">Privacy <span className="shimmer-text">Policy</span></h1>

                <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 text-muted-foreground leading-relaxed shadow-md">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, upload a resume, or post a job. This includes name, email, phone number, professional history, and company details. We also collect usage data, such as job searches and application activity, to improve our services.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
                        <p>Our primary goal is to facilitate employment matches. We use your data to:</p>
                        <ul className="list-disc pl-6 mt-4 space-y-2">
                            <li>Process and manage job applications.</li>
                            <li>Enable employer discovery of candidate profiles.</li>
                            <li>Send relevant job alerts and notifications.</li>
                            <li>Improve platform functionality and security.</li>
                            <li>Verify employer legitimacy.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3. Information Sharing</h2>
                        <p>We share candidate data (resumes, contact info) with employers when a candidate applies for a job or chooses to be discoverable. We do not sell user data to third-party marketers. We may share anonymized, aggregated data for industry research and analysis.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. Data Security</h2>
                        <p>We implement industry-standard security measures, including encryption and secure storage, to protect your personal information from unauthorized access or disclosure. We use JWT-based authentication and secure session management.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. Your Data Rights</h2>
                        <p>You have the right to access, update, or delete your personal information at any time through your dashboard settings. You may also request a copy of the data we hold about you or ask us to stop processing your data for certain purposes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">6. Cookies and Tracking</h2>
                        <p>We use essential cookies to maintain your login session and improve your browsing experience. You can manage cookie preferences in your browser settings, though some platform features may not function correctly without them.</p>
                    </section>

                    <section className="pt-8 border-t border-border mt-12 flex justify-between items-center text-sm">
                        <p>Last Updated: February 26, 2026</p>
                        <Link href="/contact" className="text-[#FF7A00] font-bold">Privacy Inquiries</Link>
                    </section>
                </div>
            </div>
        </div>
    );
}
