"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getInterviewMediaErrorMessage, requestInterviewMediaStream } from "@/lib/interview-media";
import { startInterviewProctoring, type DetectionHighlight } from "@/lib/interview-proctoring";

export default function RecommendInterviewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#F59E0B] border-t-transparent rounded-full"></div></div>}>
            <RecommendInterviewContent />
        </Suspense>
    );
}

interface AnswerEvaluation {
    status: string;
    isCorrect: boolean;
    relevant: boolean;
    meaningful: boolean;
    score: number;
    confidence: number;
    feedback: string;
}

interface AssessmentQuestionItem {
    topic: string;
    difficulty: string;
    question: string;
}

const HIDDEN_INTERVIEW_FEEDBACK_PREFIXES = [
    "AI evaluation was temporarily unavailable, so a built-in interview fallback was used.",
];

function getVisibleInterviewFeedback(feedback?: string | null) {
    if (!feedback) {
        return "";
    }

    let nextFeedback = feedback.trim();
    for (const prefix of HIDDEN_INTERVIEW_FEEDBACK_PREFIXES) {
        if (nextFeedback.startsWith(prefix)) {
            nextFeedback = nextFeedback.slice(prefix.length).trim();
        }
    }

    return nextFeedback;
}

function RecommendInterviewContent() {
    const searchParams = useSearchParams();
    const roleParam = searchParams.get("role")?.trim() || "";

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioChunks = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);
    const currentTranscriptRef = useRef<string>("");
    const answerTextRef = useRef<string>("");
    const speechTranscriptRef = useRef<string>("");
    const shouldProcessRecordingRef = useRef(false);
    const terminationRef = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const allTranscriptsRef = useRef<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<string[]>([]);
    const [questionItems, setQuestionItems] = useState<AssessmentQuestionItem[]>([]);
    const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
    const [answerText, setAnswerText] = useState("");
    const [answerEvaluation, setAnswerEvaluation] = useState<AnswerEvaluation | null>(null);
    const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
    const [assessmentAnalysis, setAssessmentAnalysis] = useState("");
    const [assessmentRole, setAssessmentRole] = useState(roleParam);

    const [showRules, setShowRules] = useState(false);
    const [eligibilityError, setEligibilityError] = useState<string | null>(null);
    const [proctorWarning, setProctorWarning] = useState("");
    const [proctorWarningCount, setProctorWarningCount] = useState(0);
    const [terminationMessage, setTerminationMessage] = useState("");
    const [proctorHighlight, setProctorHighlight] = useState<DetectionHighlight | null>(null);
    const proctorHighlightTimeoutRef = useRef<number | null>(null);

    const liveTranscript = answerText.trim();
    const visibleAnswerFeedback = getVisibleInterviewFeedback(answerEvaluation?.feedback);
    const activeRole = assessmentRole || roleParam || "Profile-based assessment";
    const currentQuestionItem = questionItems[currentQuestionIndex];

    const questionsMap: Record<string, string[]> = {
        "frontend": [
            "How do you optimize a React application for performance?",
            "Explain the difference between useMemo and useCallback.",
            "How do you handle state management in large-scale applications?",
            "What is the Virtual DOM and how does it work?",
            "Describe your experience with CSS-in-JS vs CSS Modules.",
            "How do you ensure accessibility in your web applications?",
            "What are the pros and cons of Server-Side Rendering (SSR)?",
            "Explain the event loop in JavaScript.",
            "How do you handle unit testing in React?",
            "Describe a complex technical challenge you solved in a frontend project."
        ],
        "backend": [
            "Explain how you would design a scalable REST API.",
            "What are the pros and cons of SQL vs NoSQL databases?",
            "How do you handle authentication and authorization in a microservices architecture?",
            "Describe the CAP theorem and its relevance to distributed systems.",
            "How do you implement rate limiting in an API?",
            "What is a message queue and when would you use one?",
            "How do you approach database indexing for performance?",
            "Explain the difference between vertical and horizontal scaling.",
            "Describe your experience with containerization and orchestration.",
            "How do you handle error logging and monitoring in production?"
        ],
        "full stack": [
            "Briefly describe your favorite full-stack project and the challenges you faced.",
            "How do you ensure data consistency between frontend and backend?",
            "What is your preferred tech stack and why?",
            "Explain the role of a reverse proxy like Nginx.",
            "How do you handle session management across multiple servers?",
            "Describe your approach to API security.",
            "How do you optimize database queries for better response times?",
            "Explain the difference between WebSockets and Long Polling.",
            "How do you handle file uploads in a full-stack application?",
            "Describe your experience with CI/CD pipelines."
        ],
        "devops": [
            "Explain the concept of Infrastructure as Code (IaC).",
            "How do you set up a CI/CD pipeline for a production application?",
            "Describe your experience with containerization using Docker and Kubernetes.",
            "What is GitOps and how does it benefit the deployment workflow?",
            "How do you manage secrets and environment variables securely?",
            "Explain the difference between blue-green and canary deployments.",
            "How do you monitor system health and set up alerts?",
            "Describe a time you handled a significant system outage.",
            "What is the importance of 'Shift Left' in DevOps?",
            "How do you optimize cloud infrastructure costs?"
        ],
        "general": [
            "Tell us about yourself and why you're a good fit for this role.",
            "What is your greatest professional achievement?",
            "Describe a time you had to deal with a difficult teammate.",
            "How do you stay updated with the latest industry trends?",
            "What is your preferred project management methodology (Agile, Scrum, etc.)?",
            "Describe a situation where you had to learn a new technology quickly.",
            "How do you handle constructive criticism?",
            "What are your long-term career goals?",
            "Why are you leaving your current/previous role?",
            "Do you have any questions for us?"
        ]
    };

    const getFallbackQuestions = (attemptCount: number, fallbackRole = activeRole) => {
        const title = fallbackRole.toLowerCase();
        let categoryKey = "general";

        for (const key of Object.keys(questionsMap)) {
            if (title.includes(key)) {
                categoryKey = key;
                break;
            }
        }

        const categoryQuestions = [...questionsMap[categoryKey]];
        const startIndex = (attemptCount * 10) % categoryQuestions.length;

        return Array.from({ length: 10 }, (_, index) => categoryQuestions[(startIndex + index) % categoryQuestions.length]);
    };

    const buildFallbackQuestionItems = (fallbackQuestions: string[], fallbackRole: string): AssessmentQuestionItem[] => {
        return fallbackQuestions.map((question, index) => ({
            topic: index % 3 === 0 ? fallbackRole : index % 3 === 1 ? "Practical Skills" : "Communication",
            difficulty: "Adaptive",
            question,
        }));
    };

    useEffect(() => {
        const initInterview = async () => {
            try {
                const res = await fetch("/api/interview-sim/init", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: roleParam })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (!data.allowed) {
                        setEligibilityError(data.reason);
                        setLoading(false);
                        return;
                    }

                    const generatedQuestions = Array.isArray(data.questions)
                        ? data.questions.filter((question: unknown) => typeof question === "string" && question.trim())
                        : [];
                    const generatedQuestionItems = Array.isArray(data.questionItems)
                        ? data.questionItems
                            .filter((item: any) => item && typeof item.question === "string" && item.question.trim())
                            .map((item: any) => ({
                                topic: typeof item.topic === "string" && item.topic.trim() ? item.topic.trim() : "General",
                                difficulty: typeof item.difficulty === "string" && item.difficulty.trim() ? item.difficulty.trim() : "Adaptive",
                                question: item.question.trim(),
                            }))
                        : [];

                    const nextAssessmentRole = typeof data.role === "string" && data.role.trim()
                        ? data.role.trim()
                        : roleParam;
                    const fallbackQuestions = getFallbackQuestions(data.count || 0, nextAssessmentRole);
                    const nextQuestions = generatedQuestions.length > 0 ? generatedQuestions : fallbackQuestions;
                    const nextQuestionItems = generatedQuestionItems.length > 0
                        ? generatedQuestionItems
                        : buildFallbackQuestionItems(nextQuestions, nextAssessmentRole || "Profile");

                    setAssessmentRole(nextAssessmentRole);
                    setQuestions(nextQuestions);
                    setQuestionItems(nextQuestionItems);
                    setAssessmentAnalysis(typeof data.analysis === "string" ? data.analysis : "");
                    setShowRules(true);
                } else {
                    const data = await res.json().catch(() => ({}));
                    setEligibilityError(data.error || "Failed to initialize interview.");
                }
            } catch (err) {
                console.error("Init error:", err);
                setEligibilityError("Network error. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        initInterview();
    }, [roleParam]);

    const startCamera = async () => {
        try {
            terminationRef.current = false;
            setTerminationMessage("");
            setProctorWarning("");
            setProctorWarningCount(0);
            const mediaStream = await requestInterviewMediaStream();
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: unknown) {
            const message = getInterviewMediaErrorMessage(err);
            alert(message);
            console.warn("Interview media access failed:", message);
        }
    };

    useEffect(() => {
        streamRef.current = stream;

        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((error) => {
                console.warn("Interview video playback did not start automatically:", error);
            });
        }
    }, [stream]);

    useEffect(() => {
        mediaRecorderRef.current = mediaRecorder;
    }, [mediaRecorder]);

    useEffect(() => {
        allTranscriptsRef.current = allTranscripts;
    }, [allTranscripts]);

    useEffect(() => {
        if (!proctorWarning || terminationMessage) return;

        const timeoutId = window.setTimeout(() => setProctorWarning(""), 3800);
        return () => window.clearTimeout(timeoutId);
    }, [proctorWarning, terminationMessage]);

    useEffect(() => {
        return () => {
            if (proctorHighlightTimeoutRef.current) {
                window.clearTimeout(proctorHighlightTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!stream || !videoRef.current || showRules || result || terminationMessage) return;

        return startInterviewProctoring(videoRef.current, {
            onWarning: (message, warningCount, highlight) => {
                setProctorWarning(message);
                setProctorWarningCount(warningCount);
                setProctorHighlight(highlight || null);

                if (proctorHighlightTimeoutRef.current) {
                    window.clearTimeout(proctorHighlightTimeoutRef.current);
                }

                if (highlight) {
                    proctorHighlightTimeoutRef.current = window.setTimeout(() => {
                        setProctorHighlight(null);
                        proctorHighlightTimeoutRef.current = null;
                    }, 5000);
                } else {
                    proctorHighlightTimeoutRef.current = null;
                }
            },
            onTerminate: (message) => {
                terminationRef.current = true;
                setTerminationMessage(message);
                setProctorWarning("");
                setProctorHighlight(null);
                setRecording(false);
                setIsProcessing(false);

                const recorder = mediaRecorderRef.current;
                if (recorder && recorder.state !== "inactive") {
                    recorder.stop();
                }

                if (recognitionRef.current) {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                }

                const activeStream = streamRef.current;
                activeStream?.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                setStream(null);
                setMediaRecorder(null);

                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }

                const finalTranscript = allTranscriptsRef.current.join(". ") || currentTranscriptRef.current || "terminated due to suspicious face or eye movement";
                fetch("/api/interview-sim/score", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: activeRole, transcript: finalTranscript }),
                }).catch((err) => console.error("Termination scoring error:", err));
            },
        });
    }, [stream, showRules, result, terminationMessage, activeRole]);

    const updateAnswerText = (value: string) => {
        setAnswerText(value);
        answerTextRef.current = value;
        currentTranscriptRef.current = value;
    };

    const applySpeechTranscript = (spokenText: string) => {
        const normalizedSpokenText = spokenText.replace(/\s+/g, " ").trim();
        if (!normalizedSpokenText) return;

        const previousSpokenText = speechTranscriptRef.current;
        const currentAnswer = answerTextRef.current;
        speechTranscriptRef.current = normalizedSpokenText;

        if (!previousSpokenText) {
            if (!currentAnswer.trim()) {
                updateAnswerText(normalizedSpokenText);
                return;
            }

            const separator = currentAnswer.endsWith(" ") ? "" : " ";
            updateAnswerText(`${currentAnswer}${separator}${normalizedSpokenText}`);
            return;
        }

        const previousIndex = currentAnswer.toLowerCase().lastIndexOf(previousSpokenText.toLowerCase());
        if (previousIndex >= 0) {
            const nextAnswer = `${currentAnswer.slice(0, previousIndex)}${normalizedSpokenText}${currentAnswer.slice(previousIndex + previousSpokenText.length)}`;
            updateAnswerText(nextAnswer);
            return;
        }

        const separator = currentAnswer.trim() && !currentAnswer.endsWith(" ") ? " " : "";
        updateAnswerText(`${currentAnswer}${separator}${normalizedSpokenText}`);
    };

    const resetCurrentAnswer = () => {
        setAnswerText("");
        answerTextRef.current = "";
        currentTranscriptRef.current = "";
        speechTranscriptRef.current = "";
        setAnswerEvaluation(null);
        setIsEvaluatingAnswer(false);
        shouldProcessRecordingRef.current = false;
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    const stopRecordingWithoutProcessing = () => {
        shouldProcessRecordingRef.current = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        setRecording(false);
        stopSpeechRecognition();
    };

    const evaluateSubmittedAnswer = async (answer: string) => {
        const evaluationRes = await fetch("/api/ai-evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                answer,
                transcript: answer,
                question: questions[currentQuestionIndex],
                role: activeRole,
            }),
        });
        const evaluationData = await evaluationRes.json().catch(() => ({}));

        if (!evaluationRes.ok || !evaluationData?.answerEvaluation) {
            throw new Error(evaluationData?.error || "AI answer evaluation failed.");
        }

        setAnswerEvaluation(evaluationData.answerEvaluation);
    };

    const continueAfterSubmittedAnswer = async () => {
        if (!answerEvaluation || isProcessing || isEvaluatingAnswer) return;

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            resetCurrentAnswer();
            return;
        }

        setIsProcessing(true);
        const finalTranscript = allTranscriptsRef.current.join(". ");
        try {
            const scoreRes = await fetch("/api/interview-sim/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: activeRole, transcript: finalTranscript })
            });

            if (scoreRes.ok) {
                const data = await scoreRes.json();
                setResult(data);
            } else {
                throw new Error("Scoring failed");
            }
        } catch (err) {
            console.error("Processing error:", err);
            alert("Analysis failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const startRecording = () => {
        if (!stream || terminationMessage) return;

        const hasCamera = stream.getVideoTracks().some((track) => track.readyState === "live");
        const hasMicrophone = stream.getAudioTracks().some((track) => track.readyState === "live");

        if (!hasCamera || !hasMicrophone) {
            alert("Camera and microphone are required to start the interview.");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition is required for the simulated interview. Please use a browser that supports speech recognition.");
            return;
        }

        const recorder = new MediaRecorder(stream);
        audioChunks.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.current.push(e.data);
            }
        };

        recorder.onstop = async () => {
            if (terminationRef.current || !shouldProcessRecordingRef.current) return;
            shouldProcessRecordingRef.current = false;

            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
            processRecording(audioBlob);
        };

        recorder.start();
        setMediaRecorder(recorder);
        mediaRecorderRef.current = recorder;
        setRecording(true);
        setTimeLeft(60);
        resetCurrentAnswer();

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;

            currentTranscriptRef.current = "";

            recognition.onresult = (event: any) => {
                let finalTranscripts = "";
                for (let i = 0; i < event.results.length; i++) {
                    finalTranscripts += ` ${event.results[i][0].transcript}`;
                }
                applySpeechTranscript(finalTranscripts);
            };

            recognition.onend = () => {
                // Start again if still recording but recognition ended randomly
                if (mediaRecorderRef.current?.state === "recording" && recognitionRef.current) {
                    try { recognition.start(); } catch (e) { }
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            console.error("Speech recognition error:", err);
        }
    };

    const stopRecording = () => {
        const submittedAnswer = answerTextRef.current.trim();
        if (!submittedAnswer || answerEvaluation || isEvaluatingAnswer) {
            return;
        }

        currentTranscriptRef.current = submittedAnswer;
        shouldProcessRecordingRef.current = true;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            setRecording(false);
        } else {
            processRecording(new Blob([], { type: "audio/webm" }));
        }
        stopSpeechRecognition();
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (recording && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && recording) {
            if (answerTextRef.current.trim()) {
                stopRecording();
            } else {
                stopRecordingWithoutProcessing();
            }
        }
        return () => clearInterval(timer);
    }, [recording, timeLeft]);

    const processRecording = async (blob: Blob) => {
        setIsEvaluatingAnswer(true);
        try {
            let transcript = currentTranscriptRef.current.trim();

            if (!transcript || transcript.trim().length === 0) {
                alert("Please speak an answer before submitting.");
                return;
            }

            await evaluateSubmittedAnswer(transcript);
            const newTranscripts = [...allTranscripts, transcript];
            setAllTranscripts(newTranscripts);
            allTranscriptsRef.current = newTranscripts;

        } catch (err) {
            console.error("Processing error:", err);
            alert(err instanceof Error ? err.message : "Answer evaluation failed. Please try again.");
        } finally {
            setIsEvaluatingAnswer(false);
        }
    };

    // --- Anti-cheat: Tab switching detection ---
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden && !isProcessing && !result && questions.length > 0 && currentQuestionIndex < questions.length - 1 && showRules === false && !eligibilityError) {
                // Tab was switched during an active test!
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                    setRecording(false);
                }

                // Immediately redirect to home without showing the analysis screen
                router.push("/candidate-dashboard");

                // Submit empty or partial transcript to consume the attempt behind the scenes
                const finalTranscript = allTranscripts.join(". ") || "failed due to tab switch";

                fetch("/api/interview-sim/score", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        role: activeRole,
                        transcript: finalTranscript,
                    })
                }).catch(err => console.error("Termination scoring error:", err));
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isProcessing, result, questions.length, currentQuestionIndex, mediaRecorder, allTranscripts, activeRole, router, showRules, eligibilityError]);

    const endTestEarly = async () => {
        if (!confirm("Are you sure you want to end the test early and evaluate your current answers?")) return;

        if (allTranscripts.length === 0) {
            alert("Please answer at least one question before ending early.");
            return;
        }

        setIsProcessing(true);
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            setRecording(false);
        }

        const finalTranscript = allTranscripts.join(". ");
        try {
            const scoreRes = await fetch("/api/interview-sim/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: activeRole,
                    transcript: finalTranscript,
                })
            });

            if (scoreRes.ok) {
                const data = await scoreRes.json();
                setResult(data);
            } else {
                const errData = await scoreRes.json().catch(() => null);
                const errMsg = errData?.error || "Scoring failed. Please try again.";
                alert(errMsg);
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#F59E0B] border-t-transparent rounded-full"></div></div>;

    if (eligibilityError) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-muted-foreground max-w-md mb-8">{eligibilityError}</p>
                <Link href="/candidate-dashboard" className="bg-[#F59E0B] text-foreground font-bold px-8 py-3 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    if (showRules) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-zinc-900/90 border border-white/20 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-2xl shadow-black/40">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 relative z-10">Rules & Regulations</h2>
                    <p className="text-zinc-300 font-medium mb-8 relative z-10 text-sm">Please adhere to the following conditions to ensure a fair and valid assessment.</p>
                    {assessmentAnalysis && (
                        <div className="mb-5 rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 p-4 relative z-10">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[#F59E0B] mb-1">AI Profile Analysis</p>
                            <p className="text-sm text-white/80 leading-relaxed">{assessmentAnalysis}</p>
                        </div>
                    )}

                    <ul className="space-y-4 mb-10 relative z-10 text-sm">
                        <li className="flex items-start gap-4 p-3 rounded-xl bg-white/10 border border-white/20">
                            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center shrink-0 border border-[#F59E0B]/30"><svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></div>
                            <span className="text-white/80 mt-1 font-medium leading-relaxed">Ensure you are sitting in a <strong>silent and well-lit place</strong>.</span>
                        </li>
                        <li className="flex items-start gap-4 p-3 rounded-xl bg-white/10 border border-white/20">
                            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center shrink-0 border border-[#F59E0B]/30"><svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></div>
                            <span className="text-white/80 mt-1 font-medium leading-relaxed">Your <strong>face must be clearly visible</strong>. Do not turn around or look away frequently.</span>
                        </li>
                        <li className="flex items-start gap-4 p-3 rounded-xl bg-white/10 border border-white/20">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>
                            <span className="text-white/80 mt-1 font-medium leading-relaxed"><strong>No external aid</strong>. Do not use any other source like a mobile phone, a second screen, or notes for copying.</span>
                        </li>
                        <li className="flex items-start gap-4 p-3 rounded-xl bg-white/10 border border-white/20">
                            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center shrink-0 border border-[#F59E0B]/30"><svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <span className="text-white/80 mt-1 font-medium leading-relaxed">For &apos;Recommend Yourself&apos;, you are allowed <strong>1 attempt per week</strong>. New questions are generated automatically.</span>
                        </li>
                    </ul>

                    <div className="flex gap-4 relative z-10 flex-col sm:flex-row">
                        <Link href="/candidate-dashboard" className="flex-1 bg-transparent hover:bg-white/10 text-white border border-white/30 font-bold py-3.5 rounded-xl transition-all text-center">
                            Decline & Exit
                        </Link>
                        <button
                            onClick={() => {
                                setShowRules(false);
                                startCamera();
                            }}
                            className="flex-1 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black font-extrabold py-3.5 rounded-xl transition-all shadow-xl shadow-[#F59E0B]/20 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
                        >
                            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            I Agree, Start Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                <Link href="/candidate-dashboard" className="inline-flex items-center text-white/60 hover:text-[#F59E0B] transition-colors duration-300 mb-4">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-white">AI Interview <span className="shimmer-text">Simulator</span></h1>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-white/60">Practice your response for <span className="text-white font-bold">{activeRole}</span>.</p>
                        <span className="text-xs font-bold bg-white/10 text-white px-3 py-1 rounded-full border border-white/20 uppercase tracking-widest">
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                    </div>
                </div>

                <div className="mb-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                        className="h-full bg-[#F59E0B]"
                    />
                </div>

                <div className="bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-md shadow-black/40 relative">
                    <div className="aspect-video bg-gradient-to-br from-black via-zinc-950 to-black flex items-center justify-center relative">
                        {!stream ? (
                            <div className="text-center p-8">
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/15">
                                    <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                </div>
                                <h3 className="text-white font-bold text-xl mb-2">Ready to start?</h3>
                                <p className="text-zinc-400 mb-8 max-w-xs">Grant camera and microphone permissions to begin your practice session.</p>
                                <button onClick={startCamera} className="bg-[#F59E0B] text-black font-extrabold px-8 py-3 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">Enable Camera & Mic</button>
                            </div>
                        ) : (
                            <>
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                {proctorHighlight && (
                                    <div className="absolute inset-0 pointer-events-none scale-x-[-1]">
                                        <div
                                            className="absolute border-4 border-red-400/90 rounded-full shadow-[0_0_28px_rgba(248,113,113,0.75)] animate-pulse"
                                            style={{
                                                width: `${proctorHighlight.radius * 200}%`,
                                                height: `${proctorHighlight.radius * 200}%`,
                                                left: `${proctorHighlight.centerX * 100}%`,
                                                top: `${proctorHighlight.centerY * 100}%`,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                                    {currentQuestionItem && (
                                        <div className="mb-3 flex flex-wrap justify-center gap-2">
                                            <span className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#F59E0B]">
                                                {currentQuestionItem.topic}
                                            </span>
                                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/70">
                                                {currentQuestionItem.difficulty}
                                            </span>
                                        </div>
                                    )}
                                    <h2 className="text-white font-bold text-lg md:text-xl text-center max-w-2xl mx-auto drop-shadow-sm">
                                        &quot;{currentQuestionItem?.question || questions[currentQuestionIndex]}&quot;
                                    </h2>
                                </div>

                                {recording && (
                                    <div className="absolute top-24 right-6 flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-white font-bold font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                )}

                                {proctorWarning && (
                                    <div className="absolute bottom-4 left-4 z-20 max-w-sm bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-red-400 mb-1">Warning {proctorWarningCount}/3</p>
                                        <p className="text-xs font-semibold leading-relaxed">{proctorWarning}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {stream && (
                        <div className="px-8 pt-6 pb-0 border-t border-white/10 bg-zinc-900/50">
                            <div className="rounded-2xl bg-black/40 border border-white/10 px-4 py-4 text-white">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">
                                            Voice Answer Only
                                        </p>
                                        <p className="text-sm text-white/75 leading-relaxed">
                                            Speak your answer through the microphone. Your voice is converted to text internally for AI analysis.
                                        </p>
                                    </div>
                                    <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${recording ? "bg-green-500/10 text-green-400 border border-green-500/20" : answerText.trim() ? "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" : "bg-white/5 text-white/50 border border-white/10"}`}>
                                        <span className={`w-2 h-2 rounded-full ${recording ? "bg-green-400 animate-pulse" : answerText.trim() ? "bg-[#F59E0B]" : "bg-white/40"}`} />
                                        {recording ? "Listening" : answerText.trim() ? "Voice Captured" : "Ready"}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                    <div>
                                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">
                                            Live Speech Transcript
                                        </p>
                                        <p className="text-sm text-white/75 leading-relaxed">
                                            Your spoken words appear here in real time while the microphone is listening.
                                        </p>
                                    </div>
                                    <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${recording ? "bg-green-500/10 text-green-400 border border-green-500/20" : liveTranscript ? "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" : "bg-white/5 text-white/50 border border-white/10"}`}>
                                        <span className={`w-2 h-2 rounded-full ${recording ? "bg-green-400 animate-pulse" : liveTranscript ? "bg-[#F59E0B]" : "bg-white/40"}`} />
                                        {recording ? "Live" : liveTranscript ? "Captured" : "Waiting"}
                                    </div>
                                </div>
                                <div className="min-h-[112px] rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3">
                                    {liveTranscript ? (
                                        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                                            {liveTranscript}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-white/45 leading-relaxed">
                                            {recording
                                                ? "Listening for your answer..."
                                                : "Start your voice answer to see your live speech transcription here."}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {answerEvaluation && (
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${answerEvaluation.isCorrect ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                            {answerEvaluation.status}
                                        </span>
                                        <div className="flex items-center gap-3 text-xs font-bold text-white/50">
                                            <span>Score: <span className="text-white">{answerEvaluation.score}/10</span></span>
                                            <span>Confidence: <span className="text-white">{answerEvaluation.confidence}%</span></span>
                                        </div>
                                    </div>
                                    {visibleAnswerFeedback ? (
                                        <p className="text-sm text-white/80 leading-relaxed">{visibleAnswerFeedback}</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 bg-zinc-900/50">
                        <div className="text-sm text-white/60">
                            {isProcessing || isEvaluatingAnswer ? (
                                <p className="flex items-center gap-2 text-[#F59E0B] animate-pulse">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    {isEvaluatingAnswer ? "Evaluating voice answer..." : "Transcribing voice response..."}
                                </p>
                            ) : (
                                <>
                                    <p className="flex items-center gap-2 mb-1">
                                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        60s per answer
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        Evaluation after 10 questions
                                    </p>
                                </>
                            )}
                        </div>

                        {answerEvaluation ? (
                            <button
                                onClick={continueAfterSubmittedAnswer}
                                disabled={isProcessing || isEvaluatingAnswer}
                                className="w-full sm:w-auto bg-white/10 border border-white/10 text-white font-extrabold px-12 py-4 rounded-2xl transition-all shadow-sm hover:bg-white/15 flex items-center justify-center gap-2 text-lg"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                                {currentQuestionIndex === questions.length - 1 ? "Finish & Analyze" : "Next Question"}
                            </button>
                        ) : !recording ? (
                            <button
                                onClick={startRecording}
                                disabled={!stream || isProcessing || !!terminationMessage}
                                className="w-full sm:w-auto bg-[#F59E0B] disabled:opacity-50 text-black font-extrabold px-12 py-4 rounded-2xl transition-all shadow-sm shadow-[#F59E0B]/20 flex items-center justify-center gap-2 text-lg"
                            >
                                <div className="w-3 h-3 bg-black rounded-full" />
                                Start Voice Answer
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={endTestEarly}
                                    className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 font-extrabold px-6 py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm border border-red-500/20"
                                >
                                    End Test
                                </button>
                                <button
                                    onClick={stopRecording}
                                    disabled={!answerText.trim() || isEvaluatingAnswer}
                                    className="w-full sm:w-auto bg-white/10 border border-white/10 disabled:opacity-50 text-white font-extrabold px-12 py-4 rounded-2xl transition-all shadow-sm hover:bg-white/15 flex items-center justify-center gap-2 text-lg"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                                    {isEvaluatingAnswer ? "Evaluating..." : "Submit Voice Answer"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-8 bg-zinc-900/40 border border-white/10 p-6 rounded-2xl">
                    <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Interview Tips
                    </h4>
                    <ul className="text-white/60 text-sm space-y-2">
                        <li>• Keep your answer concise but structured (STAR method).</li>
                        <li>• Maintain eye contact with the camera to simulate interaction.</li>
                        <li>• Avoid filler words like &quot;um&quot; and &quot;like&quot; for a higher score.</li>
                    </ul>
                </div>
            </div>

            {/* Results Modal */}
            <AnimatePresence>
                {terminationMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-zinc-950/95 border border-red-500/30 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl shadow-black/60 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Interview Terminated</h2>
                            <p className="text-red-300 font-semibold mb-8 leading-relaxed">{terminationMessage}</p>
                            <Link
                                href="/candidate-dashboard"
                                className="block w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-xl shadow-red-500/20"
                            >
                                Return to Dashboard
                            </Link>
                        </motion.div>
                    </div>
                )}
                {!terminationMessage && (isProcessing || result) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-zinc-950/95 border border-white/10 rounded-3xl p-8 max-w-lg w-full relative z-10 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            {isProcessing ? (
                                <div className="py-12 text-center">
                                    <div className="animate-spin h-12 w-12 border-4 border-[#F59E0B] border-t-transparent rounded-full mx-auto mb-6"></div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Analyzing interview…</h2>
                                    <p className="text-white/60">Our AI is transcribing and evaluating your responses.</p>
                                    <p className="text-white/40 text-xs mt-2">This may take a moment if AI evaluation is running.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-8">
                                        <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-4xl font-black text-[#F59E0B]">{result.scores.final > 10 ? Math.round(result.scores.final / 10) : result.scores.final}</span>
                                            <span className="text-xs text-[#F59E0B]/60 font-bold mt-2">/10</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Practice Complete</h2>
                                        {result.aiAvailable && (
                                            <p className="text-xs text-green-400 mt-1 flex items-center justify-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                AI Enhanced Evaluation
                                            </p>
                                        )}
                                    </div>

                                    {/* AI Evaluation Scores */}
                                    {result.scores.ai ? (
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4 rounded-2xl border border-blue-500/20">
                                                <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Technical</p>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-2xl font-bold text-white">{result.scores.ai.technical}</span>
                                                    <span className="text-xs text-white/45 mb-1">/5</span>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4 rounded-2xl border border-purple-500/20">
                                                <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Concept</p>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-2xl font-bold text-white">{result.scores.ai.concept}</span>
                                                    <span className="text-xs text-white/45 mb-1">/5</span>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4 rounded-2xl border border-emerald-500/20">
                                                <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Communication</p>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-2xl font-bold text-white">{result.scores.ai.communication}</span>
                                                    <span className="text-xs text-white/45 mb-1">/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-3 text-center">
                                            <p className="text-yellow-500 text-xs font-medium">AI evaluation unavailable. Score based on keyword analysis only.</p>
                                        </div>
                                    )}

                                    {/* Existing keyword scores */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-zinc-900/70 p-4 rounded-2xl border border-white/10">
                                            <p className="text-[10px] font-bold text-white/55 uppercase mb-1">Keyword Communication</p>
                                            <div className="flex items-end gap-1">
                                                <span className="text-2xl font-bold text-white">{result.scores.communication > 5 ? Math.round(result.scores.communication / 10) : result.scores.communication}</span>
                                                <span className="text-xs text-white/45 mb-1">/5</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/70 p-4 rounded-2xl border border-white/10">
                                            <p className="text-[10px] font-bold text-white/55 uppercase mb-1">Keyword Technical</p>
                                            <div className="flex items-end gap-1">
                                                <span className="text-2xl font-bold text-white">{result.scores.technical > 5 ? Math.round(result.scores.technical / 10) : result.scores.technical}</span>
                                                <span className="text-xs text-white/45 mb-1">/5</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Feedback */}
                                    {result.scores.ai?.feedback && (
                                        <div className="mb-4 bg-gradient-to-br from-[#F59E0B]/5 to-transparent p-4 rounded-2xl border border-[#F59E0B]/20">
                                            <p className="text-xs font-bold text-[#F59E0B] uppercase mb-2 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                AI Feedback
                                            </p>
                                            <p className="text-white/80 text-sm leading-relaxed">{result.scores.ai.feedback}</p>
                                        </div>
                                    )}

                                    {result.scores.keywords && (
                                        <div className="mb-4 bg-black/30 p-4 rounded-2xl border border-white/10">
                                            <p className="text-xs font-bold text-white/55 uppercase mb-3">Keyword Analysis</p>
                                            <div className="flex flex-wrap gap-2">
                                                {result.scores.keywords.matched.map((kw: string, i: number) => (
                                                    <span key={i} className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                                        {kw} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                    </span>
                                                ))}
                                                {result.scores.keywords.missed.map((kw: string, i: number) => (
                                                    <span key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 opacity-70">
                                                        {kw} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 mb-4 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                                        <h3 className="text-sm font-bold text-white/55 uppercase tracking-wider sticky top-0 bg-zinc-950/95 py-1">Feedback Summary</h3>
                                        {result.feedback.filter((p: string) => !p.startsWith('AI Feedback:')).map((point: string, idx: number) => (
                                            <div key={idx} className="flex gap-3 items-start text-sm">
                                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                                <p className="text-white/80">{point}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Expandable Transcript */}
                                    <details className="mb-6 bg-black/30 rounded-2xl border border-white/10 overflow-hidden">
                                        <summary className="p-4 cursor-pointer text-xs font-bold text-white/55 uppercase hover:text-white/75 transition-colors flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            View Transcript
                                        </summary>
                                        <div className="px-4 pb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                            <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">{result.attempt?.transcript || allTranscripts.join('. ')}</p>
                                        </div>
                                    </details>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setResult(null)}
                                            className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 rounded-xl border border-white/10 transition-all"
                                        >
                                            Try Again
                                        </button>
                                        <Link
                                            href="/candidate-dashboard"
                                            className="flex-1 bg-[#F59E0B] text-black font-bold py-3.5 rounded-xl text-center transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                        >
                                            Finish
                                        </Link>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
