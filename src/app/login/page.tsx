"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { getPendingJobApplication } from "@/lib/pending-job-application";

export default function LoginPage() {
    const router = useRouter();
    const [role, setRole] = useState<"employer" | "candidate">("employer");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (getPendingJobApplication()) {
            setRole("candidate");
        }
    }, []);

    // Redirect if already logged in - use API to determine actual role
    useEffect(() => {
        fetch("/api/profile")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) {
                    router.replace(data.user.role === "candidate" ? "/candidate-dashboard" : "/employer-dashboard");
                } else {
                    setCheckingAuth(false);
                }
            })
            .catch(() => {
                setCheckingAuth(false);
            });
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, expectedRole: role }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Role mismatch check — block login if selected panel doesn't match account type
            if (data.user.role !== role) {
                const actualRole = data.user.role === "candidate" ? "Candidate" : "Employer";
                const selectedRole = role === "candidate" ? "Candidate" : "Employer";
                throw new Error(
                    `This account is registered as a ${actualRole}. Please select the "${actualRole}" tab to sign in.`
                );
            }

            if (data.requiresVerification) {
                router.push("/verify");
                return;
            }

            // Redirect based on role
            if (data.user.role === "candidate") {
                router.push("/candidate-dashboard");
            } else {
                router.push("/employer-dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-[#FF7A00] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground animate-pulse">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center relative bg-background overflow-hidden p-4">
            {/* Animated Liquid Blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FF7A00]/20 blur-[120px] pointer-events-none blob-animate"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#FF7A00]/10 blur-[120px] pointer-events-none blob-animate-reverse"></div>
            <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] bg-[#FF7A00]/5 blur-[80px] pointer-events-none blob-animate-slow"></div>

            {/* Floating Particles */}
            <div className="absolute top-[10%] left-[15%] w-1.5 h-1.5 bg-[#FF7A00]/30 rounded-full float-up" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-[30%] right-[25%] w-1 h-1 bg-foreground/20 rounded-full float-up" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-[20%] left-[60%] w-2 h-2 bg-[#FF7A00]/20 rounded-full float-up" style={{ animationDelay: '4s' }}></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href="/">
                        <img src="/brand/talorix-white.png" alt="Logo" className="hidden dark:block h-10 w-auto object-contain transition-transform hover:scale-110" loading="lazy" decoding="async" />
                        <img src="/brand/talorix-black.png" alt="Logo" className="block dark:hidden h-10 w-auto object-contain transition-transform hover:scale-110" loading="lazy" decoding="async" />
                    </Link>
                    <div className="mt-2 h-0.5 w-12 bg-primary/30 rounded-full"></div>
                </div>

                {/* Login Card */}
                <div className="liquid-card glass rounded-3xl p-8 sm:p-10 shadow-md bg-card border border-border">

                    {/* Role Toggle */}
                    <div className="flex justify-center mb-6">
                        <div className="relative flex bg-muted border border-border rounded-full p-1 gap-0">
                            {/* Sliding pill */}
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#FF7A00] transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                style={{ left: role === "employer" ? "4px" : "calc(50%)" }}
                            />
                            <button
                                type="button"
                                onClick={() => setRole("employer")}
                                className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 ${role === "employer" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Employer
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("candidate")}
                                className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 ${role === "candidate" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Candidate
                            </button>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-2 text-center">
                        {role === "employer" ? "Employer Login" : "Candidate Login"}
                    </h2>
                    <p className="text-muted-foreground text-center text-sm mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-[#FF7A00] p-4 rounded-xl text-sm mb-6 flex items-start">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-muted-foreground">Password</label>
                                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-[#FF7A00] transition-colors duration-300">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-background border border border-border rounded-xl pl-10 pr-11 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full group overflow-hidden bg-[#FF7A00] text-foreground font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    `Sign In as ${role === "employer" ? "Employer" : "Candidate"}`
                                )}
                            </span>
                            {!loading && (
                                <div className="absolute inset-0 h-full w-full scale-0 rounded-xl transition-all duration-300 group-hover:scale-100 group-hover:bg-background/20"></div>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-muted-foreground text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="text-[#FF7A00] hover:text-foreground font-semibold transition-colors duration-300">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


