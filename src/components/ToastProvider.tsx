"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/* ────────────────────────────────────────────
   Types
──────────────────────────────────────────── */
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    toast: (opts: Omit<Toast, "id">) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    dismiss: (id: string) => void;
}

/* ────────────────────────────────────────────
   Context
──────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}

/* ────────────────────────────────────────────
   Toast icons
──────────────────────────────────────────── */
function ToastIcon({ type }: { type: ToastType }) {
    if (type === "success") return (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
    if (type === "error") return (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
    if (type === "warning") return (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
    return (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

/* ────────────────────────────────────────────
   Single Toast Item
──────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = useCallback(() => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    }, [onDismiss, toast.id]);

    useEffect(() => {
        const duration = toast.duration ?? 4500;
        const t = setTimeout(() => handleDismiss(), duration);
        return () => clearTimeout(t);
    }, [toast.duration, handleDismiss]);

    const colorMap: Record<ToastType, { border: string; icon: string; bg: string; bar: string }> = {
        success: { border: "border-green-500/30", icon: "text-green-500 bg-green-500/10", bg: "bg-background", bar: "bg-green-500" },
        error: { border: "border-red-500/30", icon: "text-red-500 bg-red-500/10", bg: "bg-background", bar: "bg-red-500" },
        warning: { border: "border-amber-500/30", icon: "text-amber-500 bg-amber-500/10", bg: "bg-background", bar: "bg-amber-500" },
        info: { border: "border-blue-500/30", icon: "text-blue-500 bg-blue-500/10", bg: "bg-background", bar: "bg-blue-500" },
    };

    const c = colorMap[toast.type];

    return (
        <div
            role="alert"
            aria-live="polite"
            style={{
                transform: visible && !exiting ? "translateX(0)" : "translateX(110%)",
                opacity: visible && !exiting ? 1 : 0,
                transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease",
            }}
            className={`relative w-full max-w-sm rounded-xl border ${c.border} ${c.bg} shadow-2xl shadow-black/20 overflow-hidden pointer-events-auto`}
        >
            {/* Progress bar */}
            <div
                className={`absolute top-0 left-0 h-0.5 ${c.bar} rounded-full`}
                style={{
                    animation: `toast-shrink ${toast.duration ?? 4500}ms linear forwards`,
                }}
            />

            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
                    <ToastIcon type={toast.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-foreground leading-tight">{toast.title}</p>
                    {toast.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{toast.message}</p>
                    )}
                </div>

                {/* Close */}
                <button
                    onClick={handleDismiss}
                    className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Dismiss"
                >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────
   Toast Container (bottom-right fixed)
──────────────────────────────────────────── */
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;
    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
            aria-label="Notifications"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
    );
}

/* ────────────────────────────────────────────
   Provider
──────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((opts: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5
    }, []);

    const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
    const error = useCallback((title: string, message?: string) => toast({ type: "error", title, message }), [toast]);
    const info = useCallback((title: string, message?: string) => toast({ type: "info", title, message }), [toast]);
    const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);

    return (
        <ToastContext.Provider value={{ toasts, toast, success, error, info, warning, dismiss }}>
            {children}
            <ToastContainer toasts={toasts} dismiss={dismiss} />
            <style>{`
                @keyframes toast-shrink {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
            `}</style>
        </ToastContext.Provider>
    );
}
