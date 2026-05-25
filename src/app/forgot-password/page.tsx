"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [step, setStep] = useState<"request" | "verify">("request");
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Verify State
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const [status, setStatus] = useState<{ type: "error" | "success" | "", message: string }>({ type: "", message: "" });
    const [loading, setLoading] = useState(false);

    // Refs for OTP inputs
    const otpRefs = Array.from({ length: 6 }, () => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return { current: null as HTMLInputElement | null };
    });

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtpArr = [...otp];
        newOtpArr[index] = value;
        setOtp(newOtpArr);

        if (value && index < 5) {
            otpRefs[index + 1].current?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(pasteData)) {
            setOtp(pasteData.split(""));
            otpRefs[5].current?.focus();
        }
    };

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: "", message: "" });

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to request reset");
            }

            setStatus({ type: "success", message: "A 6-digit reset code has been sent to your email." });
            setStep("verify");
            setCooldown(60);
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (cooldown > 0) return;
        setLoading(true);
        setStatus({ type: "", message: "" });

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to resend code");

            setStatus({ type: "success", message: "A new reset code has been sent to your email." });
            setCooldown(60);
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: "", message: "" });

        const fullOtp = otp.join("");
        if (fullOtp.length < 6) {
            setStatus({ type: "error", message: "Please enter the full 6-digit code." });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: fullOtp, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setStatus({ type: "success", message: "Password reset successfully! Redirecting to login..." });
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center relative bg-background overflow-hidden p-4">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FF7A00]/20 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#FF7A00]/10 blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Removed Logo Area to save vertical space on mobile and prevent scrolling */}

                <div className="bg-card backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-border shadow-md">
                    {/* Icon */}
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF7A00]/10 mb-4">
                            {step === "request" ? (
                                <svg className="w-8 h-8 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Reset Password</h2>
                    <p className="text-muted-foreground text-center text-sm mb-8">
                        {step === "request"
                            ? "Enter your email and we'll send a 6-digit code to reset your password."
                            : (
                                <>
                                    Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span>
                                </>
                            )
                        }
                    </p>

                    {status.message && (
                        <div className={`p-4 rounded-xl text-sm mb-6 flex items-start border ${status.type === "error"
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-green-500/10 border-green-500/30 text-green-400"
                            }`}>
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {status.type === "error" ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                            </svg>
                            <span>{status.message}</span>
                        </div>
                    )}

                    {step === "request" ? (
                        <form onSubmit={handleRequestReset} className="space-y-6">
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
                                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full bg-[#FF7A00] text-foreground font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#FF7A00]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </span>
                                ) : "Send Reset Code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyAndReset} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-muted-foreground">6-Digit Code</label>
                                <div className="flex justify-between gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { otpRefs[idx].current = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                            className={`w-full h-14 bg-background border rounded-xl text-center text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-[#FF7A00] transition-all ${digit ? "border-[#FF7A00]/50 bg-[#FF7A00]/5" : "border-border"
                                                }`}
                                            maxLength={1}
                                            autoComplete="one-time-code"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-muted-foreground">New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    </div>
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl pl-10 pr-11 py-3.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(p => !p)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                    >
                                        {showNewPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters long.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.join("").length < 6 || !newPassword}
                                className="w-full bg-[#FF7A00] text-foreground font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#FF7A00]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resetting...
                                    </span>
                                ) : "Set New Password"}
                            </button>

                            {/* Resend code + change email */}
                            <div className="flex items-center justify-between text-sm">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={cooldown > 0 || loading}
                                    className="text-[#FF7A00] hover:text-foreground font-medium transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                                </button>
                                <button type="button" onClick={() => { setStep("request"); setOtp(["", "", "", "", "", ""]); }} className="text-muted-foreground hover:text-foreground transition-colors duration-300">
                                    Change email
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <Link href="/login" className="text-muted-foreground text-sm hover:text-foreground transition-colors duration-300 inline-flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to log in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
