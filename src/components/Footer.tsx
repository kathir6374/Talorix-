"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function Footer() {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);

        try {
            const res = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Subscription failed");
            }

            setStatus({
                type: "success",
                message: data.message || "Subscribed successfully.",
            });
            setEmail("");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unable to subscribe right now.";
            setStatus({
                type: "error",
                message: errorMessage,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <footer className="bg-background pt-24 pb-12 border-t border-border relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF7A00]/50 to-transparent opacity-30"></div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    <div className="lg:col-span-1">
                        <Link href="/" className="inline-block transition-transform hover:scale-105 mb-6">
                            {!mounted ? (
                                <div className="w-[210px] h-[56px] bg-transparent" />
                            ) : (
                                <img
                                    src={(theme === "dark" || (theme === "system" && systemTheme === "dark")) ? "/brand/talorix-white.png" : "/brand/talorix-black.png"}
                                    alt="Talorix Logo"
                                    className="object-contain w-[210px] md:w-[240px] h-auto"
                                    loading="lazy"
                                />
                            )}
                        </Link>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs">
                            Connecting ambition with opportunity. The modern talent ecosystem built for the next generation of industry leaders.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-foreground font-bold mb-6">Platform</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Browse Jobs</Link>
                            </li>
                            <li>
                                <Link href="/candidate/interview-sim/recommend" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Practice AI Interview</Link>
                            </li>
                            <li>
                                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Sign In</Link>
                            </li>
                            <li>
                                <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Create Account</Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-foreground font-bold mb-6">For Employers</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/signup?role=employer" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Post a Job</Link>
                            </li>
                            <li>
                                <Link href="/employer-dashboard" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm">Employer Dashboard</Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-foreground font-bold mb-6">Join the newsletter</h3>
                        <p className="text-muted-foreground text-sm mb-6">The latest platform updates and opportunities sent to your inbox.</p>
                        <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                className="bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 transition-all w-full"
                                suppressHydrationWarning
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-[#FF7A00] hover:bg-[#FF7A00]/90 text-foreground font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                suppressHydrationWarning
                            >
                                {submitting ? "Subscribing..." : "Subscribe"}
                            </button>
                            {status && (
                                <p
                                    className={`text-xs font-medium ${status.type === "success" ? "text-green-500" : "text-red-500"}`}
                                    suppressHydrationWarning
                                >
                                    {status.message}
                                </p>
                            )}
                        </form>
                    </div>
                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-muted-foreground text-sm">
                        &copy; {mounted ? new Date().getFullYear() : "2026"} Talorix Platform 
                        {" "}<Link href="https://www.monarchsoftwares.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">A MONARCH SOFTWARES PRODUCT</Link>
                        {" "}All rights reserved.
                    </p>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-xs font-medium uppercase tracking-widest">Privacy Policy</Link>
                        <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-xs font-medium uppercase tracking-widest">Terms of Service</Link>
                        <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-xs font-medium uppercase tracking-widest">Contact Us</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
