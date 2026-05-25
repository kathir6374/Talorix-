"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState("candidate"); // Default role
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showExistsPopup, setShowExistsPopup] = useState(false);
    const [existsMessage, setExistsMessage] = useState("");
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { error: toastError } = useToast();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setShowExistsPopup(false);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Check if it's an "account already exists" error
                if (data.code === "ACCOUNT_EXISTS") {
                    setExistsMessage(data.error);
                    setShowExistsPopup(true);
                    toastError("Account Already Exists", "Please sign in to your existing account.");
                    return;
                }
                throw new Error(data.error || "Signup failed");
            }


            // Redirect to verification page — OTP has been sent to email/WhatsApp
            router.push("/verify");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center relative bg-background overflow-hidden p-4">
            {/* Animated Liquid Blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FF7A00]/20 blur-[120px] pointer-events-none blob-animate"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#FF7A00]/10 blur-[120px] pointer-events-none blob-animate-reverse"></div>
            <div className="absolute top-[30%] right-[40%] w-[250px] h-[250px] bg-[#FF7A00]/5 blur-[80px] pointer-events-none blob-animate-slow"></div>

            {/* Floating Particles */}
            <div className="absolute top-[15%] right-[10%] w-1.5 h-1.5 bg-[#FF7A00]/30 rounded-full float-up" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-[50%] left-[10%] w-1 h-1 bg-foreground/20 rounded-full float-up" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-[25%] right-[55%] w-2 h-2 bg-[#FF7A00]/20 rounded-full float-up" style={{ animationDelay: '5s' }}></div>

            <div className="w-full max-w-lg relative z-10 my-8">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href="/">
                        <img src="/brand/talorix-white.png" alt="Logo" className="hidden dark:block h-10 w-auto object-contain transition-transform hover:scale-110" loading="lazy" decoding="async" />
                        <img src="/brand/talorix-black.png" alt="Logo" className="block dark:hidden h-10 w-auto object-contain transition-transform hover:scale-110" loading="lazy" decoding="async" />
                    </Link>
                    <div className="mt-2 h-0.5 w-12 bg-primary/30 rounded-full"></div>
                </div>

                {/* Signup Card */}
                <div className="liquid-card glass rounded-3xl p-8 sm:p-10 shadow-md bg-card border border-border">
                    <h2 className="text-xl font-bold text-foreground mb-2 text-center">Create an account</h2>
                    <p className="text-muted-foreground text-center text-sm mb-8">Join Talorix to find your next opportunity</p>

                    {showExistsPopup && (
                        <div className="bg-[#FF7A00]/10 border border-[#FF7A00]/30 p-5 rounded-xl text-sm mb-6 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-[#FF7A00]/20 rounded-full flex items-center justify-center mb-3 text-[#FF7A00]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                            </div>
                            <h3 className="text-foreground font-bold text-lg mb-1">Account Already Exists</h3>
                            <p className="text-muted-foreground mb-4">{existsMessage}</p>
                            <Link href="/login" className="w-full bg-foreground text-background font-bold py-2.5 px-4 rounded-lg transition-all hover:bg-foreground/90 text-center">
                                Go to Sign In
                            </Link>
                        </div>
                    )}

                    {error && !showExistsPopup && (
                        <div className="bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-[#FF7A00] p-4 rounded-xl text-sm mb-6 flex items-start">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Role Selection */}
                        <div className="p-1 bg-muted rounded-xl flex border border-border">
                            <button
                                type="button"
                                onClick={() => setRole("candidate")}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${role === "candidate"
                                    ? "bg-[#FF7A00] text-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/5 border border-transparent"
                                    }`}
                            >
                                I&apos;m a Candidate
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("employer")}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${role === "employer"
                                    ? "bg-[#FF7A00] text-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/5 border border-transparent"
                                    }`}
                            >
                                I&apos;m an Employer
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">
                                {role === "employer" ? "Company name" : "Full name"}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-background border border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all"
                                    placeholder={role === "employer" ? "TechCorp India" : "Rahul Sharma"}
                                    required
                                />
                            </div>
                        </div>

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
                            <label className="block text-sm font-medium text-muted-foreground">Password</label>
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
                                    minLength={6}
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
                            <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters long.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-background border border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all"
                                    placeholder="+91 98765 43210"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full group overflow-hidden bg-[#FF7A00] text-foreground font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] mt-4"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating account...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </span>
                            {!loading && (
                                <div className="absolute inset-0 h-full w-full scale-0 rounded-xl transition-all duration-300 group-hover:scale-100 group-hover:bg-background/20"></div>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-muted-foreground text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#FF7A00] hover:text-foreground font-semibold transition-colors duration-300">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
