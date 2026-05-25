import { NextResponse } from "next/server";
import { generateGeminiContentWithRotation, getGeminiApiKeys } from "@/lib/gemini";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";
const GEMINI_MODEL = "gemini-2.5-flash";

// Max transcript length to avoid overloading local or hosted AI providers.
const MAX_TRANSCRIPT_LENGTH = 3000;

interface AIEvaluation {
    technical: number;
    concept: number;
    communication: number;
    finalScore: number;
    feedback: string;
    isCorrect: boolean;
    relevant: boolean;
    meaningful: boolean;
    confidence: number;
    status: string;
}

const FALLBACK_STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "how",
    "i", "in", "is", "it", "me", "my", "of", "on", "or", "our", "the", "their",
    "there", "this", "to", "was", "we", "what", "when", "where", "which", "why",
    "with", "you", "your",
]);

function clampNumber(value: unknown, min: number, max: number, fallback = 0) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return fallback;
    return Math.max(min, Math.min(max, numberValue));
}

function extractJsonObject(rawResponse: string) {
    const cleanedResponse = rawResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleanedResponse);
    } catch {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            return null;
        }
    }
}

function extractGeminiText(payload: any) {
    if (typeof payload?.text === "string" && payload.text.trim()) {
        return payload.text.trim();
    }

    const parts = payload?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";

    return parts
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("")
        .trim();
}

function extractSignalKeywords(text: string, limit: number) {
    if (!text) return [];

    const uniqueKeywords = new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, " ")
            .split(/\s+/)
            .map((word) => word.trim())
            .filter((word) => word.length > 2 && !FALLBACK_STOP_WORDS.has(word))
    );

    return Array.from(uniqueKeywords).slice(0, limit);
}

function buildPrompt(input: {
    transcript: string;
    role: string;
    question: string;
}) {
    const questionInstruction = input.question
        ? [
            `Question asked: "${input.question}"`,
            "Evaluate whether the candidate directly answered this exact question.",
            "Mark isCorrect false if the answer is unrelated, too vague, copied, empty, or does not meaningfully address the question.",
        ].join("\n")
        : "No single question was supplied. Evaluate the full interview transcript for the role.";

    return `You are a strict technical interview evaluator.

The candidate answer was captured from microphone speech recognition only.
Evaluate it as a voice interview response, not as a typed written answer.

IMPORTANT:
Evaluate technical understanding separately from communication.

A candidate may have poor English but strong technical knowledge.
Do NOT penalize for accent or minor speech-recognition grammar mistakes.

Focus on:
- correctness of concepts
- relevance to the asked question
- meaningful explanation
- depth of understanding
- logical explanation

Communication score should measure voice communication quality:
- speaking confidence inferred from structure and directness
- communication clarity
- fluency and coherence
- relevance to the question
- response quality and professional speaking behavior

Penalize:
- incorrect concepts
- vague answers
- unrelated answers
- keyword stuffing
- empty or meaningless answers
- rambling without answering the question
- very fragmented or unclear speech transcripts

Do NOT reward:
- fluent English without real technical depth
- answers that sound confident but do not answer the question

The candidate was interviewed for the role: "${input.role || "General"}".
${questionInstruction}

Return ONLY valid JSON with this exact shape. No markdown, no code blocks, no extra text:

{
  "technical": number (0-5),
  "concept": number (0-5),
  "communication": number (0-5),
  "finalScore": number (0-10),
  "isCorrect": boolean,
  "relevant": boolean,
  "meaningful": boolean,
  "confidence": number (0-100),
  "status": "Correct" or "Incorrect",
  "feedback": "short actionable feedback"
}

Candidate answer/transcript:
"${input.transcript}"`;
}

function normalizeEvaluation(rawEvaluation: any): AIEvaluation {
    const technical = clampNumber(rawEvaluation?.technical, 0, 5);
    const concept = clampNumber(rawEvaluation?.concept, 0, 5);
    const communication = clampNumber(rawEvaluation?.communication, 0, 5);
    const calculatedFinalScore = parseFloat(
        (((technical * 0.5) + (concept * 0.3) + (communication * 0.2)) * 2).toFixed(2)
    );
    const finalScore = clampNumber(rawEvaluation?.finalScore, 0, 10, calculatedFinalScore);
    const relevant = typeof rawEvaluation?.relevant === "boolean"
        ? rawEvaluation.relevant
        : finalScore >= 5;
    const meaningful = typeof rawEvaluation?.meaningful === "boolean"
        ? rawEvaluation.meaningful
        : finalScore >= 5;
    const isCorrect = typeof rawEvaluation?.isCorrect === "boolean"
        ? rawEvaluation.isCorrect
        : finalScore >= 6 && relevant && meaningful;
    const confidence = clampNumber(rawEvaluation?.confidence, 0, 100, Math.round(finalScore * 10));

    return {
        technical,
        concept,
        communication,
        finalScore,
        isCorrect,
        relevant,
        meaningful,
        confidence,
        status: isCorrect ? "Correct" : "Incorrect",
        feedback: String(rawEvaluation?.feedback || "No feedback provided."),
    };
}

function buildFallbackEvaluation(input: { transcript: string; role: string; question: string }) {
    const normalizedTranscript = input.transcript.replace(/\s+/g, " ").trim();
    const transcriptLower = normalizedTranscript.toLowerCase();
    const words = normalizedTranscript ? normalizedTranscript.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const sentenceCount = normalizedTranscript
        .split(/[.!?]+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean).length;

    const roleKeywords = extractSignalKeywords(input.role, 4);
    const questionKeywords = extractSignalKeywords(input.question, 8);
    const targetKeywords = [...new Set([...questionKeywords, ...roleKeywords])];
    const matchedKeywords = targetKeywords.filter((keyword) => transcriptLower.includes(keyword));
    const keywordCoverage = targetKeywords.length > 0 ? matchedKeywords.length / targetKeywords.length : 0;

    const lengthSignal = Math.min(1, wordCount / 45);
    const structureSignal = Math.min(1, Math.max(sentenceCount, 1) / 4);
    const relevanceSignal = targetKeywords.length > 0 ? keywordCoverage : Math.min(1, wordCount / 25);
    const depthSignal = Math.min(1, Math.max(wordCount - 10, 0) / 55);

    const technical = Number((Math.min(1, (relevanceSignal * 0.65) + (depthSignal * 0.35)) * 5).toFixed(2));
    const concept = Number((Math.min(1, (relevanceSignal * 0.55) + (structureSignal * 0.15) + (lengthSignal * 0.3)) * 5).toFixed(2));
    const communication = Number((Math.min(1, (lengthSignal * 0.45) + (structureSignal * 0.4) + (wordCount >= 10 ? 0.15 : 0)) * 5).toFixed(2));

    const relevant = targetKeywords.length > 0 ? matchedKeywords.length > 0 : wordCount >= 6;
    const meaningful = wordCount >= 8 && sentenceCount >= 1;
    const finalScore = Number((((technical * 0.5) + (concept * 0.3) + (communication * 0.2)) * 2).toFixed(2));
    const isCorrect = relevant && meaningful && finalScore >= 4;

    let feedback = "AI evaluation was temporarily unavailable, so a built-in interview fallback was used.";
    if (!meaningful) {
        feedback += " Add a longer, more complete spoken explanation so your reasoning is clearer.";
    } else if (!relevant) {
        feedback += " Your answer needs to address the exact question more directly.";
    } else if (matchedKeywords.length > 0) {
        feedback += ` You covered relevant concepts such as ${matchedKeywords.slice(0, 3).join(", ")}.`;
    } else {
        feedback += " Include more role-specific concepts and concrete examples in your answer.";
    }

    return normalizeEvaluation({
        technical,
        concept,
        communication,
        finalScore,
        isCorrect,
        relevant,
        meaningful,
        confidence: Math.round(Math.min(100, Math.max(20, finalScore * 10))),
        status: isCorrect ? "Correct" : "Incorrect",
        feedback,
    });
}

async function evaluateWithGemini(prompt: string) {
    const configuredKeys = getGeminiApiKeys();
    if (configuredKeys.length === 0) {
        console.error("[AI Evaluate] No valid Gemini API keys were found. Check GEMINI_API_KEY / GEMINI_API_KEYS formatting in .env.local.");
        return null;
    }

    const result = await generateGeminiContentWithRotation({
        model: GEMINI_MODEL,
        timeoutMs: 30000,
        requestLabel: "AI interview answer evaluation",
        body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 500,
            },
        },
    });

    if (!result) {
        return null;
    }

    const payload = result.payload;
    const rawResponse = extractGeminiText(payload);
    if (!rawResponse) {
        console.error("[AI Evaluate] Gemini returned an empty response payload.");
        return null;
    }

    const parsed = extractJsonObject(rawResponse);
    if (!parsed) {
        console.error("[AI Evaluate] Gemini returned a non-JSON or unparsable response.", rawResponse.slice(0, 500));
        return null;
    }

    return parsed;
}

async function evaluateWithOllama(prompt: string) {
    let response: Response;
    try {
        response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                format: "json",
                options: {
                    temperature: 0.3,
                    num_predict: 300,
                },
            }),
            signal: AbortSignal.timeout(60000),
        });
    } catch (error) {
        console.error("[AI Evaluate] Ollama request failed before a response was received.", error);
        return null;
    }

    if (!response.ok) {
        console.error("[AI Evaluate] Ollama response not OK:", response.status);
        return null;
    }

    const data = await response.json();
    const rawResponse = data.response || "";
    if (!rawResponse) {
        console.error("[AI Evaluate] Ollama returned an empty response payload.");
        return null;
    }

    const parsed = extractJsonObject(rawResponse);
    if (!parsed) {
        console.error("[AI Evaluate] Ollama returned a non-JSON or unparsable response.", String(rawResponse).slice(0, 500));
        return null;
    }

    return parsed;
}

export async function POST(req: Request) {
    let fallbackAnswerText = "";
    let fallbackRole = "General";
    let fallbackQuestion = "";

    try {
        const { transcript, answer, role, question } = await req.json();
        const answerText = typeof answer === "string" && answer.trim() ? answer : transcript;
        fallbackAnswerText = typeof answerText === "string" ? answerText : "";
        fallbackRole = typeof role === "string" ? role : "General";
        fallbackQuestion = typeof question === "string" ? question : "";

        if (!answerText || typeof answerText !== "string") {
            return NextResponse.json({ error: "Missing or invalid transcript" }, { status: 400 });
        }

        const trimmedTranscript = answerText.slice(0, MAX_TRANSCRIPT_LENGTH);
        const prompt = buildPrompt({
            transcript: trimmedTranscript,
            role: fallbackRole,
            question: fallbackQuestion,
        });

        let rawEvaluation = await evaluateWithGemini(prompt);
        let evaluationSource: "gemini" | "ollama" | "fallback" = "gemini";
        if (!rawEvaluation) {
            evaluationSource = "ollama";
            rawEvaluation = await evaluateWithOllama(prompt);
        }

        if (!rawEvaluation) {
            console.warn("[AI Evaluate] Falling back to the built-in interview evaluator because both Gemini and Ollama were unavailable.");
            const fallbackEvaluation = buildFallbackEvaluation({
                transcript: trimmedTranscript,
                role: fallbackRole,
                question: fallbackQuestion,
            });

            return NextResponse.json({
                available: false,
                source: "fallback",
                evaluation: fallbackEvaluation,
                answerEvaluation: {
                    status: fallbackEvaluation.status,
                    isCorrect: fallbackEvaluation.isCorrect,
                    relevant: fallbackEvaluation.relevant,
                    meaningful: fallbackEvaluation.meaningful,
                    score: fallbackEvaluation.finalScore,
                    confidence: fallbackEvaluation.confidence,
                    feedback: fallbackEvaluation.feedback,
                },
            });
        }

        const evaluation = normalizeEvaluation(rawEvaluation);
        console.info(`[AI Evaluate] Answer evaluation succeeded via ${evaluationSource}.`);

        return NextResponse.json({
            available: true,
            source: evaluationSource,
            evaluation,
            answerEvaluation: {
                status: evaluation.status,
                isCorrect: evaluation.isCorrect,
                relevant: evaluation.relevant,
                meaningful: evaluation.meaningful,
                score: evaluation.finalScore,
                confidence: evaluation.confidence,
                feedback: evaluation.feedback,
            },
        });

    } catch (error: any) {
        console.error("AI evaluation error:", error?.message || error);

        if (fallbackAnswerText) {
            const fallbackEvaluation = buildFallbackEvaluation({
                transcript: fallbackAnswerText.slice(0, MAX_TRANSCRIPT_LENGTH),
                role: fallbackRole,
                question: fallbackQuestion,
            });

            return NextResponse.json({
                available: false,
                source: "fallback",
                evaluation: fallbackEvaluation,
                answerEvaluation: {
                    status: fallbackEvaluation.status,
                    isCorrect: fallbackEvaluation.isCorrect,
                    relevant: fallbackEvaluation.relevant,
                    meaningful: fallbackEvaluation.meaningful,
                    score: fallbackEvaluation.finalScore,
                    confidence: fallbackEvaluation.confidence,
                    feedback: fallbackEvaluation.feedback,
                },
            });
        }

        return NextResponse.json({ error: "AI evaluation unavailable", available: false }, { status: 503 });
    }
}
