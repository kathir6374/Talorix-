import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { generateGeminiContentWithRotation } from "@/lib/gemini";

const GEMINI_MODEL = "gemini-2.5-flash";
const QUESTION_COUNT = 10;

type AssessmentQuestionItem = {
    topic: string;
    difficulty: string;
    question: string;
};

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

function getStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
                return Object.values(item)
                    .filter((entry) => typeof entry === "string")
                    .join(" ");
            }
            return "";
        })
        .map((item) => item.trim())
        .filter(Boolean);
}

function limitText(value: string, maxLength = 900) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3)}...`;
}

function buildProfileSignals(profile: any) {
    const skills = getStringArray(profile.skills);
    const experience = getStringArray(profile.experience);
    const education = getStringArray(profile.education);
    const certifications = getStringArray(profile.certifications);
    const projects = getStringArray(profile.projects);
    const portfolioLinks = getStringArray(profile.portfolio_links);

    const signals = [
        profile.headline && `Headline: ${profile.headline}`,
        profile.bio && `Bio: ${limitText(profile.bio)}`,
        profile.current_job_title && `Current role: ${profile.current_job_title}`,
        profile.current_company && `Current company: ${profile.current_company}`,
        profile.total_experience && `Total experience: ${profile.total_experience}`,
        skills.length > 0 && `Skills: ${skills.slice(0, 16).join(", ")}`,
        experience.length > 0 && `Experience: ${experience.slice(0, 5).map((item) => limitText(item, 240)).join(" | ")}`,
        education.length > 0 && `Education: ${education.slice(0, 4).map((item) => limitText(item, 180)).join(" | ")}`,
        certifications.length > 0 && `Certifications: ${certifications.slice(0, 5).join(" | ")}`,
        projects.length > 0 && `Projects: ${projects.slice(0, 5).map((item) => limitText(item, 220)).join(" | ")}`,
        portfolioLinks.length > 0 && `Portfolio: ${portfolioLinks.slice(0, 4).join(", ")}`,
        profile.resume_url && profile.resume_url !== "No resume provided" && "Resume uploaded: yes",
    ].filter(Boolean) as string[];

    return {
        signals,
        hasUsableProfile: signals.length > 0,
    };
}

function parseExperienceYears(value: unknown) {
    if (typeof value !== "string") return null;

    const normalized = value.toLowerCase();
    const numericMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/);
    if (numericMatch?.[1]) return Number(numericMatch[1]);

    const bareNumberMatch = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
    if (bareNumberMatch?.[1]) return Number(bareNumberMatch[1]);

    if (/\bfresher\b|\bentry\b|\bintern\b|\bstudent\b/.test(normalized)) return 0;
    if (/\bjunior\b/.test(normalized)) return 1;
    if (/\bmid\b|\bintermediate\b/.test(normalized)) return 3;
    if (/\bsenior\b|\blead\b|\bprincipal\b|\barchitect\b/.test(normalized)) return 6;

    return null;
}

function inferExperienceLevel(profile: any) {
    const explicitYears = parseExperienceYears(profile.total_experience);
    const experienceEntries = Array.isArray(profile.experience) ? profile.experience.length : 0;
    const years = explicitYears ?? (experienceEntries > 0 ? Math.min(8, experienceEntries * 1.5) : 0);

    if (years >= 8) {
        return {
            label: "Expert",
            difficulty: "Expert",
            instruction: "Ask architecture, tradeoff, scale, mentoring, incident, and strategic decision questions.",
        };
    }

    if (years >= 5) {
        return {
            label: "Senior",
            difficulty: "Advanced",
            instruction: "Ask design, ownership, debugging, tradeoff, performance, and leadership-adjacent questions.",
        };
    }

    if (years >= 2) {
        return {
            label: "Mid-level",
            difficulty: "Intermediate",
            instruction: "Ask practical implementation, debugging, integration, and project execution questions.",
        };
    }

    if (years > 0) {
        return {
            label: "Junior",
            difficulty: "Junior",
            instruction: "Ask fundamentals plus simple applied scenarios and profile-based examples.",
        };
    }

    return {
        label: "Entry-level",
        difficulty: "Beginner",
        instruction: "Ask fundamentals, basic scenarios, learning approach, and profile-based starter examples.",
    };
}

function extractAssessmentTopics(assessmentFocus: string, targetRole: string, profile: any, profileSignals: string[]) {
    const topics = new Set<string>();
    const skills = getStringArray(profile.skills);
    const projects = getStringArray(profile.projects);
    const certifications = getStringArray(profile.certifications);
    const roleWords = `${targetRole} ${assessmentFocus}`
        .split(/[,\s/|+-]+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 2 && !["developer", "engineer", "manager", "role", "profile", "assessment"].includes(word.toLowerCase()));

    skills.slice(0, 4).forEach((skill) => topics.add(skill));
    certifications.slice(0, 2).forEach((cert) => topics.add(cert.split(/\s+-\s+|\s+by\s+/i)[0] || cert));
    projects.slice(0, 2).forEach((project) => {
        const projectTitle = project.split(/[.|:-]/)[0]?.trim();
        if (projectTitle) topics.add(projectTitle);
    });
    roleWords.slice(0, 3).forEach((word) => topics.add(word));

    if (topics.size === 0 && profileSignals[0]) {
        topics.add(profileSignals[0].replace(/^[^:]+:\s*/, "").slice(0, 40));
    }

    if (topics.size === 0) {
        topics.add(assessmentFocus);
    }

    topics.add("Communication");

    return Array.from(topics)
        .map((topic) => topic.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 6);
}

function normalizeQuestion(value: unknown) {
    if (typeof value !== "string") return "";
    return value
        .replace(/^\s*\d+[\).:-]\s*/, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeQuestionItem(value: any, fallbackTopic: string, fallbackDifficulty: string): AssessmentQuestionItem | null {
    if (typeof value === "string") {
        const question = normalizeQuestion(value);
        return question ? { topic: fallbackTopic, difficulty: fallbackDifficulty, question } : null;
    }

    if (!value || typeof value !== "object") return null;

    const question = normalizeQuestion(value.question);
    if (!question) return null;

    return {
        topic: typeof value.topic === "string" && value.topic.trim() ? value.topic.trim() : fallbackTopic,
        difficulty: typeof value.difficulty === "string" && value.difficulty.trim() ? value.difficulty.trim() : fallbackDifficulty,
        question,
    };
}

function extractQuestionItems(parsed: any, fallbackDifficulty: string) {
    const items: AssessmentQuestionItem[] = [];

    if (Array.isArray(parsed?.questionItems)) {
        for (const item of parsed.questionItems) {
            const normalized = normalizeQuestionItem(item, "General", fallbackDifficulty);
            if (normalized) items.push(normalized);
        }
    }

    if (items.length === 0 && Array.isArray(parsed?.topics)) {
        for (const section of parsed.topics) {
            const topic = typeof section?.topic === "string" && section.topic.trim() ? section.topic.trim() : "General";
            const difficulty = typeof section?.difficulty === "string" && section.difficulty.trim() ? section.difficulty.trim() : fallbackDifficulty;
            const questions = Array.isArray(section?.questions) ? section.questions : [];
            for (const question of questions) {
                const normalized = normalizeQuestionItem(question, topic, difficulty);
                if (normalized) items.push(normalized);
            }
        }
    }

    if (items.length === 0 && Array.isArray(parsed?.questions)) {
        for (const question of parsed.questions) {
            const normalized = normalizeQuestionItem(question, "General", fallbackDifficulty);
            if (normalized) items.push(normalized);
        }
    }

    return items;
}

function ensureQuestionItemsCount(
    questionItems: AssessmentQuestionItem[],
    assessmentFocus: string,
    profileSignals: string[],
    topics: string[],
    difficulty: string
) {
    const uniqueItems: AssessmentQuestionItem[] = [];
    const seenQuestions = new Set<string>();

    for (const item of questionItems) {
        const normalized = normalizeQuestion(item.question);
        const key = normalized.toLowerCase();
        if (!normalized || seenQuestions.has(key)) continue;

        seenQuestions.add(key);
        uniqueItems.push({
            topic: item.topic || "General",
            difficulty: item.difficulty || difficulty,
            question: normalized,
        });
    }

    const profileHint = profileSignals[0]?.replace(/^[^:]+:\s*/, "") || "your background";
    const fallbackTopics = topics.length > 0 ? topics : [assessmentFocus, "Communication"];
    const fallbackQuestions: AssessmentQuestionItem[] = [
        { topic: fallbackTopics[0], difficulty, question: `Explain your strongest concept in ${fallbackTopics[0]} and how you applied it.` },
        { topic: fallbackTopics[1] || fallbackTopics[0], difficulty, question: `Describe a practical problem you solved related to ${fallbackTopics[1] || fallbackTopics[0]}.` },
        { topic: fallbackTopics[2] || assessmentFocus, difficulty, question: `What tradeoffs would you consider when working on ${fallbackTopics[2] || assessmentFocus}?` },
        { topic: "Profile Evidence", difficulty, question: `Which profile detail best proves your readiness for ${assessmentFocus}, and why?` },
        { topic: "Problem Solving", difficulty, question: `Tell me about a challenge from ${profileHint} and how you solved it.` },
        { topic: fallbackTopics[3] || assessmentFocus, difficulty, question: `How would you improve quality or performance in ${fallbackTopics[3] || assessmentFocus}?` },
        { topic: "Growth Areas", difficulty, question: `What gaps do you see between your current profile and ${assessmentFocus}, and how are you improving them?` },
        { topic: "Collaboration", difficulty, question: `Describe a time you collaborated with others to deliver a result relevant to ${assessmentFocus}.` },
        { topic: "Execution", difficulty, question: `How do you measure whether your work is successful in ${assessmentFocus}?` },
        { topic: "Communication", difficulty, question: `Why should employers recommend you for opportunities related to ${assessmentFocus}?` },
    ];

    for (const item of fallbackQuestions) {
        if (uniqueItems.length >= QUESTION_COUNT) break;
        const key = item.question.toLowerCase();
        if (!seenQuestions.has(key)) {
            seenQuestions.add(key);
            uniqueItems.push(item);
        }
    }

    return uniqueItems.slice(0, QUESTION_COUNT);
}

async function generateRecommendQuestions(
    assessmentFocus: string,
    targetRole: string,
    profile: any,
    profileSignals: string[],
    attemptCount: number
) {
    const experience = inferExperienceLevel(profile);
    const topics = extractAssessmentTopics(assessmentFocus, targetRole, profile, profileSignals);
    const profileContext = profileSignals.length > 0
        ? profileSignals.map((signal) => `- ${signal}`).join("\n")
        : "- No saved profile details were found. Use the target role as the assessment context.";

    const prompt = `You are creating a fair voice interview assessment for a candidate who clicked "Recommend Yourself".

Assessment focus: "${assessmentFocus}"
Target role from candidate input: "${targetRole || "not provided"}"
Inferred experience level: "${experience.label}"
Difficulty target: "${experience.difficulty}"
Difficulty instruction: ${experience.instruction}
Topics to cover separately:
${topics.map((topic) => `- ${topic}`).join("\n")}

Candidate profile signals:
${profileContext}

Create exactly ${QUESTION_COUNT} interview questions.
Rules:
- Questions must be related to the assessment focus.
- Questions must be separated across the listed topics. Do not make all questions about the same topic.
- Every question must include a topic and difficulty.
- Increase depth and complexity according to the inferred experience level.
- If profile signals exist, ask questions directly related to those profile details.
- If no profile signals exist, ask questions related to the target role.
- Mix technical/domain questions, practical scenario questions, and profile-based behavioral questions.
- Do not ask trivia disconnected from the assessment focus.
- Do not mention that the profile has limited data.
- Keep each question under 28 words.
- Use a different angle for attempt number ${attemptCount + 1}.

Return ONLY valid JSON:
{
  "analysis": "one sentence summary of role/profile fit",
  "questionItems": [
    { "topic": "topic name", "difficulty": "${experience.difficulty}", "question": "question text" }
  ]
}`;

    const result = await generateGeminiContentWithRotation({
        model: GEMINI_MODEL,
        timeoutMs: 30000,
        requestLabel: "Recommend Yourself question generation",
        body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.45,
                maxOutputTokens: 1200,
            },
        },
    });

    if (!result) {
        return {
            source: "fallback" as const,
            analysis: `Questions were separated by topic and calibrated for ${experience.label} experience.`,
            questions: ensureQuestionItemsCount([], assessmentFocus, profileSignals, topics, experience.difficulty).map((item) => item.question),
            questionItems: ensureQuestionItemsCount([], assessmentFocus, profileSignals, topics, experience.difficulty),
            experienceLevel: experience.label,
        };
    }

    const rawText = extractGeminiText(result.payload);
    const parsed = rawText ? extractJsonObject(rawText) : null;
    const questionItems = ensureQuestionItemsCount(
        extractQuestionItems(parsed, experience.difficulty),
        assessmentFocus,
        profileSignals,
        topics,
        experience.difficulty
    );

    return {
        source: "gemini" as const,
        analysis: typeof parsed?.analysis === "string" && parsed.analysis.trim()
            ? parsed.analysis.trim()
            : `Questions were separated by topic and calibrated for ${experience.label} experience.`,
        questions: questionItems.map((item) => item.question),
        questionItems,
        experienceLevel: experience.label,
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { jobId, role } = body;

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? await verifyAuth(token) : null;
        if (!payload || payload.role !== "candidate") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (jobId) {
            const attempts = await db.interviewAttempt.count({
                where: { user_id: payload.userId, job_id: jobId }
            });

            if (attempts >= 4) {
                return NextResponse.json({ allowed: false, reason: "You have reached the maximum of 4 attempts for this application." });
            }

            return NextResponse.json({ allowed: true, count: attempts });
        } else {
            // Recommend yourself check
            const rawTargetRole = typeof role === "string" ? role.trim() : "";
            const targetRole = rawTargetRole.toLowerCase() === "general" ? "" : rawTargetRole;

            const profile = await db.user.findUnique({
                where: { id: payload.userId },
                select: {
                    role: true,
                    headline: true,
                    bio: true,
                    skills: true,
                    experience: true,
                    education: true,
                    current_job_title: true,
                    current_company: true,
                    total_experience: true,
                    certifications: true,
                    projects: true,
                    portfolio_links: true,
                    resume_url: true,
                },
            });

            if (!profile || profile.role !== "candidate") {
                return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 });
            }

            const profileAnalysis = buildProfileSignals(profile);
            if (!profileAnalysis.hasUsableProfile && !targetRole) {
                return NextResponse.json({
                    allowed: false,
                    reason: "Add at least one profile detail or enter a target role before starting the assessment.",
                    requiresTargetRole: true,
                    missingProfileData: true,
                });
            }

            const attemptsThisWeek = await db.interviewAttempt.count({
                where: {
                    user_id: payload.userId,
                    job_id: null,
                    created_at: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (attemptsThisWeek >= 1) {
                return NextResponse.json({ allowed: false, reason: "You can only attempt one 'Recommend Yourself' test per week. Please try again next week." });
            }

            const totalAttempts = await db.interviewAttempt.count({
                where: { user_id: payload.userId, job_id: null }
            });

            const assessmentFocus = targetRole
                || profile.current_job_title
                || profile.headline
                || getStringArray(profile.skills).slice(0, 3).join(", ")
                || profileAnalysis.signals[0]?.replace(/^[^:]+:\s*/, "")
                || "candidate profile";
            const generated = await generateRecommendQuestions(
                assessmentFocus,
                targetRole,
                profile,
                profileAnalysis.signals,
                totalAttempts
            );

            return NextResponse.json({
                allowed: true,
                count: totalAttempts,
                role: assessmentFocus,
                questions: generated.questions,
                questionItems: generated.questionItems,
                experienceLevel: generated.experienceLevel,
                analysis: generated.analysis,
                questionSource: generated.source,
            });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
