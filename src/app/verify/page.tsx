"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function VerifyPage() {
    const router = useRouter();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [message, setMessage] = useState("");
    const [hasPhone, setHasPhone] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    useEffect(() => {
        setMounted(true);
        // Check if user has phone to show correct message
        fetch("/api/auth/verify/send", { method: "POST", body: JSON.stringify({ checkOnly: true }) })
            .then(res => res.json())
            .then(data => setHasPhone(data.hasPhone))
            .catch(() => { });
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(pasteData)) {
            const digits = pasteData.split("");
            setOtp(digits);
            inputRefs[5].current?.focus();
        }
    };

    const handleResend = async (method: "email" | "whatsapp" = "email") => {
        setResending(true);
        setError("");
        setMessage("");
        try {
            const res = await fetch("/api/auth/verify/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method }),
            });
            const data = await res.json();
            if (res.ok) {
                let baseMessage = "";
                if (data.sentVia === "both") {
                    baseMessage = "OTP sent to your email and WhatsApp";
                } else if (data.sentVia === "whatsapp") {
                    baseMessage = "OTP sent to your WhatsApp number";
                } else {
                    baseMessage = "OTP sent to your email address";
                }

                setMessage(baseMessage);

                setHasPhone(data.hasPhone || false);
                setCooldown(30); // 30 second cooldown
            } else {
                setError(data.error || "Failed to send OTP");
            }
        } catch {
            setError("Failed to connect to the server.");
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        const fullOtp = otp.join("");
        if (fullOtp.length < 6) {
            setError("Please enter the full 6-digit code.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/verify/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: fullOtp }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage("Account verified! Redirecting...");
                // Fetch profile to know where to redirect
                const profileRes = await fetch("/api/profile");
                const profileData = await profileRes.json();

                setTimeout(() => {
                    if (profileData?.user?.role === "candidate") {
                        router.push("/candidate-dashboard");
                    } else {
                        router.push("/employer-dashboard");
                    }
                }, 1500);
            } else {
                setError(data.error || "Verification failed");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center relative bg-background overflow-hidden p-4">
            {/* Animated Liquid Blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FF7A00]/20 blur-[120px] pointer-events-none blob-animate"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#FF7A00]/10 blur-[120px] pointer-events-none blob-animate-reverse"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Removed Logo Area to save vertical space on mobile and prevent scrolling */}

                <div className="liquid-card glass rounded-3xl p-8 sm:p-10 shadow-md bg-card border border-border">
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF7A00]/10 mb-4">
                            <svg className="w-8 h-8 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Verify Your Account</h2>
                    <p className="text-muted-foreground text-center text-sm mb-8">
                        We&apos;ve sent a 6-digit verification code to your email
                        {hasPhone ? " and WhatsApp." : "."}
                        <br />
                        <span className="text-xs text-muted-foreground/70">Enter it below to secure your account.</span>
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-sm mb-6 flex items-start">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={inputRefs[idx]}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    className={`w-full h-14 bg-background border rounded-xl text-center text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all ${digit ? "border-[#FF7A00]/50 bg-[#FF7A00]/5" : "border-border"
                                        }`}
                                    maxLength={1}
                                    autoComplete="one-time-code"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join("").length < 6}
                            className="relative w-full group overflow-hidden bg-[#FF7A00] text-foreground font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        Verify Account
                                    </>
                                )}
                            </span>
                            {!loading && (
                                <div className="absolute inset-0 h-full w-full scale-0 rounded-xl transition-all duration-300 group-hover:scale-100 group-hover:bg-background/20"></div>
                            )}
                        </button>
                    </form>

                    {/* Resend Options */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-muted-foreground text-sm text-center mb-4">
                            Didn&apos;t receive the code?
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Email Resend */}
                            <button
                                onClick={() => handleResend("email")}
                                disabled={resending || cooldown > 0}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-[#FF7A00]/10 hover:border-[#FF7A00]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {resending ? "Sending..." : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend via Email"}
                            </button>

                            {/* WhatsApp Resend — only shown if user has a phone number */}
                            {hasPhone && (
                                <button
                                    onClick={() => handleResend("whatsapp")}
                                    disabled={resending || cooldown > 0}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/15 hover:border-[#25D366]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    {resending ? "Sending..." : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend via WhatsApp"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
