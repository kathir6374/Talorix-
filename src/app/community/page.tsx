"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Author {
    name: string;
    avatar_url: string | null;
    role: string;
    company_logo_url?: string | null;
}

interface Post {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    video_url: string | null;
    author_id: string;
    author_role: string;
    post_type: string;
    is_pinned: boolean;
    created_at: string;
    score: number;
    userVote: number;
    author: Author;
    _count: {
        comments: number;
    }
}

// Assuming Header component is imported from somewhere
// import Header from "@/components/Header"; // Add this if Header is a component

export default function CommunityPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

    // Create Post State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("blog");
    const [isPinned, setIsPinned] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
        fetchUser();
    }, [filter, sortBy]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/posts?type=${filter}&sortBy=${sortBy}`);
            const data = await res.json();
            if (data.posts) setPosts(data.posts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isGoogleDriveUrl = (url: string | null) => {
        if (!url) return false;
        return url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com") || url.includes("docs.google.com");
    };

    const getGoogleDriveDirectLink = (url: string | null, isVideo = false, size = 1000) => {
        if (!url) return null;
        const fileIdMatch = url.match(/[-\w]{25,}/);
        if (fileIdMatch && isGoogleDriveUrl(url)) {
            const fileId = fileIdMatch[0];
            if (isVideo) {
                return `https://docs.google.com/file/d/${fileId}/preview`;
            }
            return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
        }
        return url;
    };

    const isYouTubeUrl = (url: string | null) => {
        if (!url) return false;
        return url.includes("youtube.com") || url.includes("youtu.be");
    };

    const getYouTubeEmbedUrl = (url: string | null) => {
        if (!url) return "";
        let videoId = "";
        if (url.includes("v=")) {
            videoId = url.split("v=")[1].split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        }
        return `https://www.youtube.com/embed/${videoId}`;
    };

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (err) { }
    };

    const handleVote = async (postId: string, value: number) => {
        if (!user) {
            window.location.href = "/login";
            return;
        }

        // Optimistic update
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const oldVote = p.userVote;
                const newVote = oldVote === value ? 0 : value;
                const scoreDiff = newVote - oldVote;
                return { ...p, userVote: newVote, score: p.score + scoreDiff };
            }
            return p;
        }));

        try {
            const post = posts.find(p => p.id === postId);
            const newValue = post?.userVote === value ? 0 : value;
            await fetch(`/api/posts/${postId}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: newValue })
            });
        } catch (err) {
            fetchPosts(); // Rollback on error
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Vercel has a strict 4.5MB limit for serverless body size.
        // We limit to 4MB to be safe.
        const VERCEL_LIMIT = 4 * 1024 * 1024;
        if (file.size > VERCEL_LIMIT) {
            alert("Vercel limit: Please upload a file smaller than 4MB. For larger videos, please use a direct link.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            console.log(`Starting upload for ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            const res = await fetch("/api/upload/media", {
                method: "POST",
                body: formData
            });

            const contentType = res.headers.get("content-type");
            if (!res.ok) {
                const text = await res.text();
                console.error("Upload failed server response:", text);
                let errorMsg = "Upload failed";
                try {
                    const data = JSON.parse(text);
                    errorMsg = data.error || errorMsg;
                } catch {
                    errorMsg = `Server error (${res.status})`;
                }
                alert(errorMsg);
                return;
            }

            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Invalid server response format (Not JSON)");
            }

            const data = await res.json();
            if (data.success) {
                if (data.type === "image") {
                    setImageUrl(data.url);
                    setVideoUrl("");
                } else {
                    setVideoUrl(data.url);
                    setImageUrl("");
                }
                console.log("Upload successful:", data.url);
            } else {
                alert(data.error || "Upload failed");
            }
        } catch (err: any) {
            console.error("Upload Error:", err);
            alert("Connection error: " + (err.message || "Please check your internet and try again."));
        } finally {
            setUploading(false);
        }
    };

    const handleShare = (postId: string) => {
        const url = `${window.location.origin}/community/${postId}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copied to clipboard!");
        }).catch(err => {
            console.error("Could not copy text: ", err);
        });
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const payload = {
            title,
            content,
            post_type: postType,
            is_pinned: isPinned,
            image_url: imageUrl,
            video_url: videoUrl
        };
        console.log("Submitting Post Payload:", payload);

        try {
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setTitle("");
                setContent("");
                setImageUrl("");
                setVideoUrl("");
                fetchPosts();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const canPost = !!user;

    return (
        <div className="min-h-screen bg-background pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Left - Navigation/Filters */}
                    <aside className="lg:w-64 shrink-0 hidden lg:block">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-card border border-border rounded-2xl p-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Feeds</h3>
                                <nav className="space-y-1">
                                    {[
                                        { id: "newest", label: "Newest", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                                        { id: "top", label: "Popular", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSortBy(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${sortBy === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                                                }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                            </svg>
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Categories</h3>
                                <nav className="space-y-1">
                                    {[
                                        { id: "all", label: "All Posts" },
                                        { id: "blog", label: "Blogs" },
                                        { id: "tech", label: "Tech Talk" },
                                        { id: "announcement", label: "Announcements" },
                                        { id: "ad", label: "Promotions" },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setFilter(item.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </aside>

                    {/* Main Feed */}
                    <main className="flex-1 min-w-0 space-y-6">

                        {/* Mobile Category Scroll */}
                        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {[
                                { id: "all", label: "All Posts" },
                                { id: "blog", label: "Blogs" },
                                { id: "tech", label: "Tech Talk" },
                                { id: "announcement", label: "Announcements" },
                                { id: "ad", label: "Promotions" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFilter(item.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${filter === item.id ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground"
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Create Post Entry (Reddit Style) */}
                        {user && (
                            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
                                    {user.avatar_url ? <img src={getGoogleDriveDirectLink(user.avatar_url, false, 100)!} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-sm">{user.name[0]}</div>}
                                </div>
                                <input
                                    readOnly
                                    onClick={() => canPost ? setIsCreateModalOpen(true) : alert("Please log in to post.")}
                                    placeholder={canPost ? "Share something with the community..." : "Log in to join the conversation..."}
                                    className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none cursor-pointer hover:bg-muted transition-colors"
                                />
                                {canPost && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 bg-muted rounded-full" />
                                            <div className="space-y-2">
                                                <div className="w-32 h-4 bg-muted rounded" />
                                                <div className="w-24 h-3 bg-muted rounded" />
                                            </div>
                                        </div>
                                        <div className="w-full h-6 bg-muted rounded" />
                                        <div className="w-2/3 h-4 bg-muted rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center">
                                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                                <p className="text-muted-foreground">Be the first to start the conversation!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {posts.map(post => (
                                    <article key={post.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all flex flex-col group h-full">
                                        {(post.image_url || post.video_url) && (
                                            <Link href={`/community/${post.id}`} className="block relative aspect-[2/1] overflow-hidden border-b border-border bg-muted/20">
                                                {post.video_url ? (
                                                    isYouTubeUrl(post.video_url) ? (
                                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                                            <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                                        </div>
                                                     ) : isGoogleDriveUrl(post.video_url) ? (
                                                        <div className="w-full h-full bg-black flex items-center justify-center group/play relative overflow-hidden">
                                                            <img 
                                                                src={getGoogleDriveDirectLink(post.video_url, false, 400)!} 
                                                                alt="" 
                                                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/play:scale-105 transition-transform duration-500" 
                                                                loading="lazy"
                                                                decoding="async"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                            <div className="absolute inset-0 bg-blue-500/10 flex flex-col items-center justify-center gap-2 z-10 transition-colors group-hover/play:bg-blue-500/20">
                                                                <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center text-primary group-hover/play:scale-110 transition-transform shadow-xl">
                                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Play Video</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <video src={post.video_url} className="w-full h-full object-cover" muted loop onMouseOver={(e) => e.currentTarget.play()} onMouseOut={(e) => e.currentTarget.pause()} />
                                                    )
                                                ) : (
                                                    <img src={getGoogleDriveDirectLink(post.image_url, false, 400)!} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                                                )}
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-widest">{post.post_type}</div>
                                            </Link>
                                        )}

                                        <div className="flex-1 p-4 flex flex-col">
                                            <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                <span className="text-primary">{post.author_role === "admin" ? "Admin" : post.author.name}</span>
                                                <span>•</span>
                                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>

                                            <Link href={`/community/${post.id}`} className="block mb-2 flex-1">
                                                <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                                    {post.title}
                                                </h2>
                                                <div className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-1">
                                                    {post.content}
                                                </div>
                                            </Link>

                                            <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                                                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleVote(post.id, 1); }}
                                                        className={`p-1 transition-all ${post.userVote === 1 ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 004 14h4v7a1 1 0 001 1h6a1 1 0 001-1v-7h4a1.001 1.001 0 00.781-1.625l-8-10z" /></svg>
                                                    </button>
                                                    <span className="text-xs font-black min-w-[12px] text-center">{post.score}</span>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleVote(post.id, -1); }}
                                                        className={`p-1 transition-all ${post.userVote === -1 ? "text-red-500 scale-110" : "text-muted-foreground hover:text-foreground"}`}
                                                    >
                                                        <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 004 14h4v7a1 1 0 001 1h6a1 1 0 001-1v-7h4a1.001 1.001 0 00.781-1.625l-8-10z" /></svg>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Link href={`/community/${post.id}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                        {post._count.comments}
                                                    </Link>
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); handleShare(post.id); }}
                                                        className="text-muted-foreground hover:text-primary transition-colors"
                                                        title="Share post"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </main>

                    {/* Sidebar Right - Extra Info */}
                    <aside className="lg:w-80 shrink-0 hidden xl:block">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-primary rounded-3xl p-6 text-white overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-700" />
                                <h3 className="text-xl font-bold mb-3 relative z-10">Talorix Community</h3>
                                <p className="text-white/80 text-sm mb-6 relative z-10">
                                    The #1 space for candidates and HRs to discuss hiring, tech trends, and career growth.
                                </p>
                                <button
                                    onClick={() => setIsRulesModalOpen(true)}
                                    className="w-full bg-white text-primary font-bold py-3 rounded-2xl hover:bg-opacity-90 transition-all relative z-10"
                                >
                                    Browse Rules
                                </button>
                            </div>

                            <div className="bg-card border border-border rounded-3xl p-6">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Top Contributors</h3>
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted border border-border shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="h-3 w-20 bg-muted rounded mb-1" />
                                                <div className="h-2 w-12 bg-muted rounded" />
                                            </div>
                                            <div className="text-[10px] font-bold text-primary">LVL {12 - i}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Create Community Post</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-xl hover:bg-muted">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</label>
                                    <select
                                        value={postType}
                                        onChange={(e) => setPostType(e.target.value)}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none appearance-none font-bold"
                                    >
                                        <option value="blog">Blog Post</option>
                                        <option value="tech">Tech Talk</option>
                                        <option value="announcement">Announcement</option>
                                        <option value="ad">Promotion/Ad</option>
                                    </select>
                                </div>
                                {user?.is_admin && (
                                    <div className="flex items-center gap-2 pt-6">
                                        <input
                                            type="checkbox"
                                            id="pinned"
                                            checked={isPinned}
                                            onChange={(e) => setIsPinned(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                        />
                                        <label htmlFor="pinned" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pin to Top</label>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Rethinking how hiring works..."
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between">
                                    <span>Content</span>
                                    <span className="normal-case font-medium opacity-50 lowercase tracking-normal">Press Enter Twice for Paragraphs</span>
                                </label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Share your thoughts... Use multiple lines for better formatting!"
                                    rows={6}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all resize-none leading-[1.6]"
                                />
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Media (Upload or URL)</label>
                                <div className="space-y-3">
                                    <div className="flex gap-4 items-center">
                                        <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 transition-all ${uploading ? 'bg-muted border-border cursor-not-allowed' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'}`}>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,video/*"
                                                disabled={uploading}
                                                onChange={handleFileUpload}
                                            />
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-2 text-primary">
                                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-[9px] font-bold">UPLOADING...</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-center">Select Media</span>
                                                </div>
                                            )}
                                        </label>
                                        {(imageUrl || videoUrl) && (
                                            <div className="w-24 h-24 rounded-2xl border border-border overflow-hidden bg-muted flex items-center justify-center relative group">
                                                {imageUrl ? (
                                                    <img src={getGoogleDriveDirectLink(imageUrl, false, 200)!} className="w-full h-full object-cover" alt="Preview" loading="lazy" decoding="async" />
                                                ) : (
                                                    isYouTubeUrl(videoUrl) ? (
                                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-white/50">YOUTUBE PREVIEW NA</span>
                                                        </div>
                                                    ) : (
                                                        <video src={getGoogleDriveDirectLink(videoUrl, true)!} className="w-full h-full object-cover" muted />
                                                    )
                                                )}
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setImageUrl(""); setVideoUrl(""); }}
                                                        className="bg-red-500 p-1.5 rounded-full hover:scale-110 transition-all"
                                                    >
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative flex items-center gap-4">
                                        <div className="flex-1 h-[1px] bg-border/50" />
                                        <span className="text-[9px] font-black text-muted-foreground uppercase bg-card px-2">OR</span>
                                        <div className="flex-1 h-[1px] bg-border/50" />
                                    </div>

                                    <input
                                        value={imageUrl || videoUrl}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i)) {
                                                setVideoUrl(val);
                                                setImageUrl("");
                                            } else {
                                                setImageUrl(val);
                                                setVideoUrl("");
                                            }
                                        }}
                                        placeholder="Paste image/video URL here..."
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs focus:border-primary/40 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="w-full bg-primary text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 shadow-xl shadow-primary/20"
                            >
                                {submitting ? "Publishing..." : "Publish to Community"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Rules Modal */}
            {isRulesModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsRulesModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Community Rules</h2>
                            <button onClick={() => setIsRulesModalOpen(false)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-none pb-4">
                            <div className="space-y-2">
                                <h3 className="text-[14px] font-black text-primary uppercase tracking-wider">1. Be Professional & Respectful</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">Treat everyone with respect. No harassment, hate speech, or derogatory comments. This is a professional network for career growth.</p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[14px] font-black text-primary uppercase tracking-wider">2. No Spam or Self-Promotion</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">Do not post irrelevant links, excessive self-promotion, or repetitive content. Keep discussions valuable to the community.</p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[14px] font-black text-primary uppercase tracking-wider">3. Stay On Topic</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">Ensure your posts fit the category (Tech, Hiring, Blogs, etc.). Irrelevant posts may be removed or moved by admins.</p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[14px] font-black text-primary uppercase tracking-wider">4. Protect Privacy</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">Never share someone else&apos;s personal information, private communications, or confidential company details without permission.</p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[14px] font-black text-primary uppercase tracking-wider">5. Admin Discretion</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">Admins have the final say and can remove content or suspend accounts that violate these rules or disrupt the community.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsRulesModalOpen(false)}
                            className="w-full bg-primary text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 mt-6"
                        >
                            Got It, Thanks!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
