"use client";

export function BackButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            onClick={() => window.history.back()}
            className={className}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
        </button>
    );
}
