"use client";

import { useState } from "react";

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send your message");
            }

            setSent(true);
            setName("");
            setEmail("");
            setSubject("");
            setMessage("");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unable to send your message right now.";
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 relative overflow-hidden transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF7A00]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FF7A00]/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        {/* Content */}
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-6">
                                    Get in <span className="shimmer-text">Touch</span>
                                </h1>
                                <p className="text-xl text-muted-foreground leading-relaxed max-w-md">
                                    Have questions about Talorix? Our team is here to help you navigate the future of talent.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-5 group">
                                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-[#FF7A00] group-hover:bg-[#FF7A00]/10 group-hover:border-[#FF7A00]/30 transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-bold">Email Us</h3>
                                        <p className="text-muted-foreground">hello@talorix.com</p>
                                        <p className="text-muted-foreground">kathir86205@gmail.com</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 group">
                                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-[#FF7A00] group-hover:bg-[#FF7A00]/10 group-hover:border-[#FF7A00]/30 transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-bold">Visit Us</h3>
                                        <p className="text-muted-foreground">123 Tech Avenue, Silicon Valley, CA</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 group">
                                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-[#FF7A00] group-hover:bg-[#FF7A00]/10 group-hover:border-[#FF7A00]/30 transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-bold">Support</h3>
                                        <p className="text-muted-foreground">24/7 Live Chat available</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="glass backdrop-blur-3xl border border-border rounded-3xl p-8 shadow-md">
                            {sent ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-6">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h2>
                                    <p className="text-muted-foreground mb-8">We&apos;ve received your inquiry and will get back to you shortly.</p>
                                    <button onClick={() => setSent(false)} className="text-[#FF7A00] font-bold border-b border-[#FF7A00]">Send another message</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-muted-foreground mb-2">Full Name</label>
                                            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma"
                                                className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-muted-foreground mb-2">Email Address</label>
                                            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rahul@example.com"
                                                className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2">Subject</label>
                                        <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="How can we help?"
                                            className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2">Message</label>
                                        <textarea required rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us more about your inquiry..."
                                            className="w-full bg-background border border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 transition-all resize-none" />
                                    </div>
                                    <button disabled={submitting} type="submit"
                                        className="w-full bg-[#FF7A00] hover:bg-[#FF7A00]/90 text-foreground font-bold py-4 rounded-xl transition-all shadow-sm shadow-[#FF7A00]/20 flex items-center justify-center">
                                        {submitting ? (
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                        ) : "Send Message"}
                                    </button>
                                    {error && (
                                        <p className="text-sm font-medium text-red-500">{error}</p>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
