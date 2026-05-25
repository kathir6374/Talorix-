"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Author {
    name: string;
    avatar_url: string | null;
    role: string;
    company_logo_url?: string | null;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author: Author;
    helpful_count: number;
    userVotedHelpful: boolean;
    replies: Comment[];
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
}

export default function PostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [commentContent, setCommentContent] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);

    useEffect(() => {
        fetchPost();
        fetchComments();
        fetchUser();
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/posts?id=${id}`);
            const data = await res.json();
            const found = data.posts?.find((p: any) => p.id === id);
            if (found) setPost(found);
        } catch (err) { }
        setLoading(false);
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
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/posts/${id}/comments`);
            const data = await res.json();
            if (data.comments) setComments(data.comments);
        } catch (err) { }
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

    const handleVote = async (value: number) => {
        if (!user) { router.push("/login"); return; }
        if (!post) return;

        const oldVote = post.userVote;
        const newVote = oldVote === value ? 0 : value;
        const scoreDiff = newVote - oldVote;

        setPost({ ...post, userVote: newVote, score: post.score + scoreDiff });

        try {
            await fetch(`/api/posts/${id}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: newVote })
            });
        } catch (err) {
            fetchPost();
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { router.push("/login"); return; }
        if (!commentContent.trim()) return;

        setSubmittingComment(true);
        try {
            const res = await fetch(`/api/posts/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentContent })
            });
            if (res.ok) {
                setCommentContent("");
                fetchComments();
            }
        } catch (err) {
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleReply = async (parentId: string) => {
        if (!user) { router.push("/login"); return; }
        if (!replyContent.trim()) return;

        setSubmittingReply(true);
        try {
            const res = await fetch(`/api/posts/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: replyContent, parent_id: parentId })
            });
            if (res.ok) {
                setReplyContent("");
                setReplyingTo(null);
                fetchComments();
            }
        } catch (err) {
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copied to clipboard!");
        }).catch(err => {
            console.error("Could not copy text: ", err);
        });
    };

    const handleHelpful = async (commentId: string) => {
        if (!user) { router.push("/login"); return; }

        // Optimistic update
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    userVotedHelpful: !c.userVotedHelpful,
                    helpful_count: c.userVotedHelpful ? c.helpful_count - 1 : c.helpful_count + 1,
                };
            }
            return {
                ...c,
                replies: c.replies?.map(r => {
                    if (r.id === commentId) {
                        return {
                            ...r,
                            userVotedHelpful: !r.userVotedHelpful,
                            helpful_count: r.userVotedHelpful ? r.helpful_count - 1 : r.helpful_count + 1,
                        };
                    }
                    return r;
                }) || [],
            };
        }));

        try {
            await fetch(`/api/posts/${id}/comments/${commentId}/helpful`, {
                method: "POST",
            });
        } catch (err) {
            fetchComments();
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
            <h2 className="text-2xl font-bold">Post not found</h2>
            <Link href="/community" className="text-primary font-bold">Back to Community</Link>
        </div>
    );

    const renderComment = (comment: Comment, isReply = false) => (
        <div key={comment.id} className={`flex gap-3 ${isReply ? "ml-12" : ""}`}>
            <div className={`${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-muted overflow-hidden border border-border shrink-0`}>
                {comment.author.avatar_url ? (
                    <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-xs">{comment.author.name[0]}</div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold">{comment.author.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                    </div>
                </div>
                <div className="flex gap-4 px-2 mt-2">
                    <button
                        onClick={() => handleHelpful(comment.id)}
                        className={`text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${comment.userVotedHelpful ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    >
                        <svg className="w-3 h-3" fill={comment.userVotedHelpful ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        Helpful{comment.helpful_count > 0 ? ` (${comment.helpful_count})` : ""}
                    </button>
                    {!isReply && (
                        <button
                            onClick={() => {
                                if (!user) { router.push("/login"); return; }
                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                setReplyContent("");
                            }}
                            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${replyingTo === comment.id ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                        >
                            Reply
                        </button>
                    )}
                </div>

                {/* Reply input */}
                {replyingTo === comment.id && (
                    <div className="mt-3 ml-1">
                        <div className="flex gap-2">
                            <input
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Reply to ${comment.author.name}...`}
                                className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(comment.id); } }}
                                autoFocus
                            />
                            <button
                                onClick={() => handleReply(comment.id)}
                                disabled={submittingReply || !replyContent.trim()}
                                className="bg-primary text-white font-bold px-4 py-2 rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 text-sm shrink-0"
                            >
                                {submittingReply ? "..." : "Reply"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Render replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {comment.replies.map(reply => renderComment(reply, true))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pt-24 pb-12">
            <div className="max-w-3xl mx-auto px-4">
                <Link href="/community" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    Back to Community
                </Link>

                <article className="bg-card border border-border rounded-2xl overflow-hidden mb-8 shadow-sm">
                    <div className="flex">
                        <div className="w-12 bg-muted/20 border-r border-border flex flex-col items-center py-6 gap-2">
                            <button
                                onClick={() => handleVote(1)}
                                className={`p-1 transition-all ${post.userVote === 1 ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"}`}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 004 14h4v7a1 1 0 001 1h6a1 1 0 001-1v-7h4a1.001 1.001 0 00.781-1.625l-8-10z" /></svg>
                            </button>
                            <span className="text-sm font-black text-foreground">{post.score}</span>
                            <button
                                onClick={() => handleVote(-1)}
                                className={`p-1 transition-all ${post.userVote === -1 ? "text-red-500 scale-110" : "text-muted-foreground hover:text-red-500"}`}
                            >
                                <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 004 14h4v7a1 1 0 001 1h6a1 1 0 001-1v-7h4a1.001 1.001 0 00.781-1.625l-8-10z" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 p-4 sm:p-6">
                            <div className="mb-4">
                                <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground mb-3 leading-tight tracking-tight">
                                    {post.title}
                                </h1>

                                <div className="flex items-center gap-3 py-3 border-y border-border/50">
                                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                                        {post.author.avatar_url || post.author.company_logo_url ? (
                                            <img src={getGoogleDriveDirectLink(post.author.avatar_url || post.author.company_logo_url || null, false, 100)!} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-sm bg-primary/10 text-primary">{post.author.name[0]}</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-foreground">{post.author.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded uppercase tracking-widest border border-primary/20">{post.author_role}</span>
                                                <button 
                                                    onClick={handleShare}
                                                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                                    title="Share Post"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">
                                            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {post.post_type}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {(post.image_url || post.video_url) && (
                                <div className="relative rounded-xl overflow-hidden border border-border mb-6 bg-muted/20 shadow-sm">
                                    {post.video_url ? (
                                        isYouTubeUrl(post.video_url) ? (
                                            <div className="aspect-video w-full">
                                                <iframe 
                                                    src={getYouTubeEmbedUrl(post.video_url)} 
                                                    className="w-full h-full" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen 
                                                />
                                            </div>
                                        ) : isGoogleDriveUrl(post.video_url) ? (
                                            <div className="aspect-video w-full">
                                                <iframe 
                                                    src={getGoogleDriveDirectLink(post.video_url, true)!} 
                                                    className="w-full h-full" 
                                                    allow="autoplay; encrypted-media; fullscreen" 
                                                    allowFullScreen 
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                        ) : (
                                            <video src={post.video_url} className="w-full object-contain max-h-[700px] bg-black" controls autoPlay muted loop playsInline />
                                        )
                                    ) : (
                                        <img src={getGoogleDriveDirectLink(post.image_url)!} alt="Featured" className="w-full object-contain max-h-[700px] w-full" loading="lazy" decoding="async" />
                                    )}
                                </div>
                            )}

                            <div className="prose prose-invert max-w-none">
                                <div className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap font-medium space-y-2">
                                    {post.content.split('\n').map((line, i) => (
                                        <p key={i} className={line.trim() === "" ? "h-2" : "mb-2"}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Comment Section */}
                <div className="space-y-8">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Discussion ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
                    </h3>

                    {user ? (
                        <form onSubmit={handleComment} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                            <textarea
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                placeholder="Add to the discussion..."
                                rows={3}
                                className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none mb-4"
                            />
                            <div className="flex justify-end">
                                <button
                                    disabled={submittingComment || !commentContent.trim()}
                                    className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50"
                                >
                                    {submittingComment ? "Posting..." : "Post Comment"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="bg-muted border border-border border-dashed rounded-3xl p-8 text-center">
                            <p className="text-muted-foreground mb-4">You need to be logged in to join the discussion.</p>
                            <Link href="/login" className="text-primary font-bold">Login to Comment</Link>
                        </div>
                    )}

                    <div className="space-y-6">
                        {comments.map(comment => renderComment(comment))}
                    </div>
                </div>
            </div>
        </div>
    );
}
