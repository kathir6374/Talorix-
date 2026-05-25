import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { updateGlobalRanks } from "@/lib/ranking";
import crypto from "crypto";

// Anti-cheat: detect keyword stuffing patterns
function detectKeywordStuffing(transcript: string, keywords: string[]): boolean {
    const lower = transcript.toLowerCase();
    const words = lower.split(/\s+/);
    const totalWords = words.length;

    // Count total keyword mentions
    let totalKeywordMentions = 0;
    keywords.forEach(kw => {
        const regex = new RegExp(kw, 'gi');
        const matches = lower.match(regex);
        if (matches) totalKeywordMentions += matches.length;
    });

    // If keywords make up more than 30% of the transcript, it's stuffing
    if (totalWords > 0 && (totalKeywordMentions / totalWords) > 0.30) return true;

    return false;
}

// Anti-cheat: check if transcript looks like natural speech
function isNaturalSpeech(transcript: string): { valid: boolean; reason: string } {
    const words = transcript.trim().split(/\s+/);
    const totalWords = words.length;

    // Must have minimum substance (at least 2 words for ALL questions combined)
    if (totalWords < 2) {
        return { valid: false, reason: "Responses too brief to evaluate accurately." };
    }

    // Check for repeated sentences (copy-paste detection)
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    if (sentences.length > 3 && uniqueSentences.size < sentences.length * 0.5) {
        return { valid: false, reason: "Repetitive content detected. Please provide unique answers." };
    }

    // Check for suspiciously perfect keyword density (AI-generated answers)
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
    const uniqueRatio = uniqueWords.size / totalWords;

    // Very low unique ratio means copy-paste or gibberish
    if (uniqueRatio < 0.15 && totalWords > 50) {
        return { valid: false, reason: "Content quality too low for evaluation." };
    }

    return { valid: true, reason: "" };
}

// Anti-cheat: detect if transcript was likely typed/pasted vs spoken
function detectNonSpeechPatterns(transcript: string): boolean {
    const lower = transcript.toLowerCase();

    // Check for markdown, code blocks, or formatting (clearly pasted)
    if (/```|#{2,}|\*\*|__|\[.*?\]\(.*?\)/.test(transcript)) return true;

    // Check for extremely long unbroken paragraphs (not natural speech)
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = transcript.length / Math.max(sentences.length, 1);
    if (avgSentenceLength > 500) return true;

    return false;
}

export async function POST(req: Request) {
    try {
        const token = req.headers.get("cookie")?.split("auth_token=")[1]?.split(";")[0];
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decoded = await verifyAuth(token);
        if (!decoded || decoded.role !== "candidate") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { jobId, role, transcript } = await req.json();

        if (!transcript || typeof transcript !== "string") {
            return NextResponse.json({ error: "Missing or invalid transcript data" }, { status: 400 });
        }

        // === ANTI-CHEAT: Rate limiting (max 1 attempt per 1 second per user for testing) ===
        const recentAttempt = await prisma.interviewAttempt.findFirst({
            where: {
                user_id: decoded.userId as string,
                created_at: { gte: new Date(Date.now() - 1 * 1000) }
            },
            orderBy: { created_at: 'desc' }
        });

        if (recentAttempt) {
            return NextResponse.json({
                error: "Please wait before making another attempt."
            }, { status: 429 });
        }

        // === ANTI-CHEAT: Validate natural speech ===
        const speechCheck = isNaturalSpeech(transcript);
        if (!speechCheck.valid) {
            return NextResponse.json({ error: speechCheck.reason }, { status: 400 });
        }

        // === ANTI-CHEAT: Detect non-speech patterns ===
        if (detectNonSpeechPatterns(transcript)) {
            return NextResponse.json({
                error: "Invalid input detected. Please use voice responses only."
            }, { status: 400 });
        }

        // Identify Job Title
        let jobTitle = role || "general";
        if (jobId && !role) {
            const job = await prisma.job.findUnique({ where: { id: jobId }, select: { job_title: true } });
            if (job) jobTitle = job.job_title;
        }

        // 1. Communication Scoring (Max 5 points, scored as 0-2.5 base)
        const fillerWords = ["um", "uh", "like", "you know", "actually", "basically", "so", "mean"];
        const transcriptLower = transcript.toLowerCase();
        const words = transcriptLower.split(/\s+/);
        let fillerCount = 0;
        words.forEach((w: string) => {
            if (fillerWords.includes(w.replace(/[.,!]/g, ""))) {
                fillerCount++;
            }
        });

        const fillerRatio = fillerCount / words.length;
        let communicationScoreBase = Math.max(0.5, Math.min(2.5, 2.5 - (fillerRatio * 7.5)));

        // Adaptability Score base (max 2.5)
        const uniqueWords = new Set(words).size;
        const varietyRatio = uniqueWords / words.length;
        let adaptabilityScoreBase = Math.max(0.5, Math.min(2.5, varietyRatio * 3.0));

        // Length Penalty (stricter: need substantial answers)
        if (words.length < 50) {
            const penalty = Math.max(0.3, words.length / 50);
            communicationScoreBase = Math.max(0.5, communicationScoreBase * penalty);
            adaptabilityScoreBase = Math.max(0.5, adaptabilityScoreBase * penalty);
        }

        const totalCommunicationScore = Math.ceil(communicationScoreBase + adaptabilityScoreBase);

        // 2. Technical Scoring (Max 5 points)
        const keywordDatabase: Record<string, string[]> = {
            // === SOFTWARE ENGINEERING ===
            'react': ['component', 'hook', 'usestate', 'useeffect', 'props', 'state', 'redux', 'context', 'render', 'virtual dom', 'jsx'],
            'angular': ['typescript', 'module', 'directive', 'service', 'dependency injection', 'observable', 'rxjs', 'component', 'routing'],
            'vue': ['component', 'vuex', 'reactive', 'directive', 'composition api', 'template', 'computed', 'watcher'],
            'next': ['server side', 'static', 'routing', 'middleware', 'api route', 'hydration', 'getserverside', 'incremental'],
            'frontend': ['html', 'css', 'javascript', 'responsive', 'dom', 'accessibility', 'performance', 'webpack', 'browser', 'layout'],
            'backend': ['api', 'server', 'database', 'middleware', 'authentication', 'authorization', 'rest', 'graphql', 'microservice', 'caching'],
            'node': ['express', 'middleware', 'async', 'event loop', 'npm', 'stream', 'buffer', 'cluster', 'module'],
            'python': ['django', 'flask', 'pandas', 'numpy', 'pip', 'virtual environment', 'decorator', 'generator', 'comprehension'],
            'java': ['spring', 'maven', 'gradle', 'jvm', 'inheritance', 'interface', 'multithreading', 'collection', 'annotation'],
            'golang': ['goroutine', 'channel', 'interface', 'struct', 'concurrency', 'module', 'pointer', 'slice'],
            'rust': ['ownership', 'borrowing', 'lifetime', 'trait', 'cargo', 'memory safety', 'concurrency', 'pattern matching'],
            'full stack': ['api', 'database', 'deployment', 'server', 'client', 'authentication', 'frontend', 'backend', 'integration'],
            'fullstack': ['api', 'database', 'deployment', 'server', 'client', 'authentication', 'frontend', 'backend', 'integration'],
            'mobile': ['ios', 'android', 'react native', 'flutter', 'responsive', 'push notification', 'offline', 'gesture', 'navigation'],
            'flutter': ['dart', 'widget', 'state management', 'bloc', 'provider', 'material', 'navigation', 'platform channel'],
            'react native': ['expo', 'native module', 'bridge', 'navigation', 'state', 'component', 'platform', 'gesture'],
            'ios': ['swift', 'xcode', 'uikit', 'swiftui', 'cocoapods', 'core data', 'delegate', 'protocol', 'storyboard'],
            'android': ['kotlin', 'gradle', 'activity', 'fragment', 'jetpack', 'compose', 'lifecycle', 'intent', 'viewmodel'],

            // === DATABASE & DATA ===
            'database': ['schema', 'query', 'index', 'normalization', 'relation', 'migration', 'transaction', 'acid', 'backup'],
            'sql': ['query', 'join', 'index', 'normalization', 'stored procedure', 'trigger', 'view', 'transaction', 'constraint'],
            'prisma': ['schema', 'migration', 'model', 'relation', 'client', 'seed', 'query', 'middleware'],
            'mongodb': ['document', 'collection', 'aggregation', 'index', 'replica', 'sharding', 'schema', 'pipeline'],
            'redis': ['cache', 'key value', 'pub sub', 'expiry', 'cluster', 'sentinel', 'data structure', 'persistence'],

            // === DEVOPS & CLOUD ===
            'devops': ['pipeline', 'docker', 'kubernetes', 'ci/cd', 'monitoring', 'infrastructure', 'deployment', 'automation', 'logging'],
            'cloud': ['aws', 'azure', 'gcp', 'serverless', 'scaling', 'load balancer', 'cdn', 'storage', 'compute'],
            'aws': ['ec2', 's3', 'lambda', 'rds', 'cloudfront', 'iam', 'vpc', 'sqs', 'dynamodb', 'elastic'],
            'docker': ['container', 'image', 'dockerfile', 'compose', 'volume', 'network', 'registry', 'orchestration'],
            'kubernetes': ['pod', 'service', 'deployment', 'ingress', 'namespace', 'helm', 'cluster', 'node', 'scaling'],
            'sre': ['reliability', 'monitoring', 'incident', 'sla', 'slo', 'observability', 'chaos engineering', 'runbook', 'alerting'],

            // === DATA SCIENCE & AI/ML ===
            'data science': ['analysis', 'visualization', 'statistics', 'python', 'model', 'dataset', 'prediction', 'regression', 'feature'],
            'data analyst': ['sql', 'excel', 'dashboard', 'tableau', 'visualization', 'report', 'trend', 'metric', 'kpi', 'insight'],
            'machine learning': ['model', 'training', 'dataset', 'feature', 'classification', 'regression', 'neural network', 'overfitting', 'accuracy'],
            'deep learning': ['neural network', 'cnn', 'rnn', 'transformer', 'loss function', 'backpropagation', 'epoch', 'batch', 'gpu'],
            'ai': ['model', 'training', 'inference', 'prompt', 'fine tuning', 'embedding', 'tokenization', 'neural', 'algorithm'],
            'nlp': ['tokenization', 'sentiment', 'classification', 'embedding', 'transformer', 'bert', 'language model', 'corpus'],
            'data engineer': ['pipeline', 'etl', 'warehouse', 'spark', 'kafka', 'airflow', 'batch', 'streaming', 'schema', 'partitioning'],

            // === CYBERSECURITY ===
            'security': ['vulnerability', 'encryption', 'authentication', 'firewall', 'penetration', 'threat', 'compliance', 'audit', 'risk'],
            'cybersecurity': ['vulnerability', 'malware', 'phishing', 'firewall', 'intrusion', 'incident response', 'siem', 'threat intelligence'],

            // === DESIGN ===
            'ui': ['wireframe', 'prototype', 'figma', 'accessibility', 'responsive', 'color', 'typography', 'layout', 'component'],
            'ux': ['user research', 'persona', 'journey map', 'usability', 'wireframe', 'prototype', 'testing', 'heuristic', 'information architecture'],
            'design': ['figma', 'prototype', 'wireframe', 'user experience', 'layout', 'typography', 'color theory', 'responsive', 'accessibility'],
            'graphic design': ['photoshop', 'illustrator', 'branding', 'typography', 'color', 'composition', 'vector', 'layout', 'print'],

            // === PRODUCT & PROJECT MANAGEMENT ===
            'product manager': ['roadmap', 'stakeholder', 'sprint', 'backlog', 'user story', 'prioritization', 'metric', 'mvp', 'a/b testing'],
            'project manager': ['timeline', 'milestone', 'risk', 'stakeholder', 'agile', 'scrum', 'budget', 'resource', 'gantt', 'deliverable'],
            'scrum': ['sprint', 'backlog', 'standup', 'retrospective', 'velocity', 'user story', 'story point', 'kanban', 'burndown'],
            'agile': ['sprint', 'iteration', 'backlog', 'user story', 'continuous', 'retrospective', 'standup', 'kanban', 'velocity'],

            // === QA & TESTING ===
            'qa': ['test case', 'regression', 'automation', 'bug', 'selenium', 'coverage', 'performance', 'integration', 'manual'],
            'testing': ['unit test', 'integration', 'end to end', 'coverage', 'mock', 'assertion', 'regression', 'automation', 'selenium'],
            'sdet': ['automation', 'framework', 'selenium', 'cypress', 'api testing', 'performance', 'ci pipeline', 'test strategy'],

            // === MARKETING & SALES ===
            'marketing': ['campaign', 'conversion', 'analytics', 'seo', 'content', 'funnel', 'engagement', 'brand', 'audience', 'roi'],
            'digital marketing': ['seo', 'sem', 'social media', 'google ads', 'analytics', 'conversion', 'content', 'email', 'campaign'],
            'seo': ['keyword', 'ranking', 'backlink', 'organic', 'crawl', 'meta', 'content', 'search console', 'sitemap', 'authority'],
            'content': ['strategy', 'editorial', 'audience', 'engagement', 'seo', 'copywriting', 'blog', 'social media', 'brand voice'],
            'sales': ['pipeline', 'lead', 'conversion', 'crm', 'negotiation', 'prospecting', 'quota', 'closing', 'revenue', 'relationship'],

            // === HR & RECRUITING ===
            'hr': ['recruitment', 'onboarding', 'performance', 'compliance', 'culture', 'retention', 'compensation', 'policy', 'training'],
            'recruiter': ['sourcing', 'screening', 'pipeline', 'candidate', 'interview', 'offer', 'onboarding', 'talent', 'diversity'],

            // === FINANCE & ACCOUNTING ===
            'finance': ['budget', 'forecast', 'revenue', 'cash flow', 'investment', 'valuation', 'compliance', 'audit', 'risk', 'return'],
            'accounting': ['ledger', 'balance sheet', 'revenue', 'expense', 'audit', 'tax', 'reconciliation', 'compliance', 'gaap'],
            'fintech': ['payment', 'transaction', 'compliance', 'blockchain', 'api', 'security', 'regulation', 'kyc', 'lending'],

            // === HEALTHCARE ===
            'healthcare': ['patient', 'clinical', 'compliance', 'hipaa', 'ehr', 'diagnosis', 'treatment', 'protocol', 'safety'],
            'medical': ['diagnosis', 'treatment', 'patient', 'clinical trial', 'regulation', 'protocol', 'documentation', 'safety'],

            // === LEGAL ===
            'legal': ['compliance', 'contract', 'regulation', 'liability', 'intellectual property', 'litigation', 'governance', 'policy'],

            // === OPERATIONS & SUPPORT ===
            'operations': ['process', 'efficiency', 'workflow', 'optimization', 'logistics', 'supply chain', 'inventory', 'quality', 'kpi'],
            'customer support': ['resolution', 'ticket', 'escalation', 'satisfaction', 'sla', 'empathy', 'troubleshooting', 'communication'],
            'customer success': ['retention', 'onboarding', 'churn', 'engagement', 'health score', 'upsell', 'renewal', 'nps'],

            // === BLOCKCHAIN & WEB3 ===
            'blockchain': ['smart contract', 'consensus', 'decentralized', 'token', 'wallet', 'gas', 'solidity', 'ethereum', 'web3'],
            'web3': ['smart contract', 'defi', 'nft', 'dao', 'wallet', 'token', 'decentralized', 'blockchain', 'metamask'],

            // === GENERAL / MANAGEMENT ===
            'manager': ['leadership', 'delegation', 'performance', 'team', 'strategy', 'communication', 'conflict resolution', 'mentoring'],
            'lead': ['architecture', 'mentoring', 'code review', 'decision', 'planning', 'delegation', 'ownership', 'standards'],
            'executive': ['strategy', 'vision', 'stakeholder', 'growth', 'leadership', 'culture', 'revenue', 'transformation'],
            'intern': ['learning', 'collaboration', 'problem solving', 'communication', 'initiative', 'adaptability', 'research', 'teamwork'],
        };

        // Universal professional keywords (always checked as baseline)
        const universalKeywords = ['experience', 'team', 'problem', 'solution', 'project', 'communication', 'challenge', 'result', 'improve', 'learn'];

        const getJobKeywords = (title: string): string[] => {
            const t = title.toLowerCase();
            const matched: Set<string> = new Set();

            // Check all keyword groups - a title can match multiple groups
            for (const [key, keywords] of Object.entries(keywordDatabase)) {
                if (t.includes(key)) {
                    keywords.forEach(kw => matched.add(kw));
                }
            }

            // If no specific match found, use universal keywords
            if (matched.size === 0) {
                universalKeywords.forEach(kw => matched.add(kw));
            }

            // Always add a few universal ones for balance (max 15 total)
            universalKeywords.slice(0, 3).forEach(kw => matched.add(kw));

            // Return top 10 most relevant (first matched are most specific)
            return Array.from(matched).slice(0, 10);
        };

        const targetKeywords = getJobKeywords(jobTitle);
        const matchedKeywords: string[] = [];
        const missedKeywords: string[] = [];

        targetKeywords.forEach(kw => {
            if (transcriptLower.includes(kw)) {
                matchedKeywords.push(kw);
            } else {
                missedKeywords.push(kw);
            }
        });

        // === ANTI-CHEAT: Detect keyword stuffing ===
        const isStuffed = detectKeywordStuffing(transcript, targetKeywords);
        let technicalScore: number;

        if (isStuffed) {
            // Penalize keyword stuffing heavily
            technicalScore = 1;
        } else {
            technicalScore = matchedKeywords.length * 0.8;

            let codeConceptBonus = 0;
            let githubMentionBonus = 0;
            if (transcriptLower.includes('dependency') || transcriptLower.includes('lifecycle')) {
                codeConceptBonus = 0.5;
            }
            if (transcriptLower.includes('github') || transcriptLower.includes('repo')) {
                githubMentionBonus = 0.5;
            }

            technicalScore = Math.ceil(Math.min(5, technicalScore + codeConceptBonus + githubMentionBonus));
        }

        // Calculate existing score (keyword-based)
        const existingScore = Math.min(10, totalCommunicationScore + technicalScore);

        // === AI EVALUATION via Ollama ===
        let aiEvaluation: any = null;
        let aiFinalScore: number | null = null;
        let finalScore = existingScore;

        try {
            const systemPrompt = `You are a strict technical interviewer.

The candidate transcript was captured from microphone speech recognition only.
Evaluate it as a voice interview, not as a typed written submission.

IMPORTANT:
Evaluate technical understanding separately from communication.

A candidate may have poor English but strong technical knowledge.
Do NOT penalize for accent or minor speech-recognition grammar mistakes.

Focus on:
- correctness of concepts
- depth of understanding
- logical explanation

Communication score should measure voice communication quality:
- speaking confidence inferred from structure and directness
- communication clarity
- fluency and coherence
- relevance to the role/question context
- response quality and professional speaking behavior

Penalize:
- incorrect concepts
- vague answers
- keyword stuffing
- rambling without meaningful explanation
- very fragmented or unclear speech transcripts

Do NOT reward:
- fluent English without real technical depth

The candidate was interviewed for the role: "${jobTitle || "General"}".

Return ONLY valid JSON (no markdown, no code blocks, no extra text):

{
  "technical": number (0-5),
  "concept": number (0-5),
  "communication": number (0-5),
  "finalScore": number (0-10),
  "feedback": "short actionable feedback"
}`;
            
            // Call Ollama directly to avoid Next.js local dev server hanging on self-fetch
            const ollamaRes = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3",
                    prompt: `${systemPrompt}\n\nCandidate transcript:\n"${transcript.slice(0, 3000)}"`,
                    stream: false,
                    format: "json",
                    options: { temperature: 0.3, num_predict: 300 }
                }),
                signal: AbortSignal.timeout(60000), // 60s timeout
            });

            if (ollamaRes.ok) {
                const ollamaData = await ollamaRes.json();
                let parsedEval = JSON.parse(ollamaData.response.trim());
                
                // Clamp scores
                parsedEval.technical = Math.max(0, Math.min(5, Number(parsedEval.technical) || 0));
                parsedEval.concept = Math.max(0, Math.min(5, Number(parsedEval.concept) || 0));
                parsedEval.communication = Math.max(0, Math.min(5, Number(parsedEval.communication) || 0));
                parsedEval.finalScore = parseFloat(
                    ((parsedEval.technical * 0.5) + (parsedEval.concept * 0.3) + (parsedEval.communication * 0.2)).toFixed(2)
                );
                parsedEval.feedback = String(parsedEval.feedback || "No feedback provided by AI.");

                aiEvaluation = parsedEval;
                aiFinalScore = parsedEval.finalScore;
                
                // Merge: existingScore * 0.6 + aiFinalScore * 0.4
                finalScore = parseFloat(((existingScore * 0.6) + ((aiFinalScore ?? 0) * 0.4)).toFixed(1));
                finalScore = Math.min(10, Math.max(0, finalScore));
            } else {
                console.error("Ollama HTTP Error:", ollamaRes.status);
            }
        } catch (aiError) {
            console.warn('AI evaluation failed or unavailable. Falling back to keyword scoring:', aiError);
        }

        // 3. Feedback Generation
        const feedbackPoints: string[] = [];

        if (isStuffed) {
            feedbackPoints.push("Keyword stuffing was detected. Focus on natural, contextual usage of technical terms.");
        }

        if (communicationScoreBase > 1.8) {
            feedbackPoints.push("Strong voice clarity and minimal use of filler words.");
        } else {
            feedbackPoints.push(`Try to speak more clearly and reduce filler words like "${fillerWords.slice(0, 3).join(", ")}".`);
        }

        if (adaptabilityScoreBase > 1.8) {
            feedbackPoints.push("Fluent spoken response with varied vocabulary and strong sentence structure observed.");
        } else {
            feedbackPoints.push("Use more structured spoken examples and professional vocabulary to strengthen your communication impact.");
        }

        if (words.length < 50) {
            feedbackPoints.push("Your responses were brief. Aim for more detailed explanations with real examples.");
        }

        if (matchedKeywords.length > 0) {
            feedbackPoints.push(`Matched keywords: ${matchedKeywords.join(', ')}`);
        }
        if (missedKeywords.length > 0) {
            feedbackPoints.push(`Missed keywords: ${missedKeywords.join(', ')}`);
        }

        const keywordMatchesData = {
            matched: matchedKeywords,
            missed: missedKeywords,
            total: targetKeywords.length
        };

        // Add AI feedback to feedback points
        if (aiEvaluation) {
            feedbackPoints.push(`AI Feedback: ${aiEvaluation.feedback}`);
        } else {
            feedbackPoints.push('AI evaluation unavailable. Score based on keyword analysis only.');
        }

        // === Generate integrity hash (tamper detection for stored results) ===
        const integrityPayload = `${decoded.userId}:${finalScore}:${totalCommunicationScore}:${technicalScore}:${Date.now()}`;
        const integrityHash = crypto.createHash('sha256').update(integrityPayload).digest('hex').slice(0, 16);

        // 4. Save to DB
        const attempt = await prisma.interviewAttempt.create({
            data: {
                user_id: decoded.userId as string,
                job_id: jobId || null,
                // @ts-ignore: Prisma client type cache lag
                role_tested_for: role || null,
                score: Math.round(finalScore),
                transcript: transcript,
                communication_score: totalCommunicationScore,
                adaptability_score: Math.round(adaptabilityScoreBase),
                // @ts-ignore
                technical_score: technicalScore,
                // @ts-ignore
                keyword_matches: keywordMatchesData,
                // @ts-ignore
                ai_technical_score: aiEvaluation?.technical ?? null,
                // @ts-ignore
                ai_concept_score: aiEvaluation?.concept ?? null,
                // @ts-ignore
                ai_communication_score: aiEvaluation?.communication ?? null,
                // @ts-ignore
                ai_final_score: aiFinalScore ?? null,
                // @ts-ignore
                ai_feedback: aiEvaluation?.feedback ?? null,
                feedback: {
                    points: feedbackPoints,
                    integrity: integrityHash,
                    word_count: words.length,
                    stuffing_detected: isStuffed,
                }
            }
        });

        await updateGlobalRanks();

        return NextResponse.json({
            success: true,
            attempt,
            scores: {
                final: Math.round(finalScore),
                communication: totalCommunicationScore,
                technical: technicalScore,
                keywords: keywordMatchesData,
                ai: aiEvaluation ? {
                    technical: aiEvaluation.technical,
                    concept: aiEvaluation.concept,
                    communication: aiEvaluation.communication,
                    finalScore: aiFinalScore,
                    feedback: aiEvaluation.feedback,
                } : null,
            },
            feedback: feedbackPoints,
            aiAvailable: !!aiEvaluation,
        });

    } catch (error) {
        console.error("Interview sim error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
