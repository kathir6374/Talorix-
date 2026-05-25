import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { readStoredResumeFileByUrl } from "@/lib/resume-storage";
import { generateGeminiContentWithRotation, getGeminiApiKeys } from "@/lib/gemini";

type JobSummary = {
    id: string;
    job_title: string;
    company_name: string;
    created_at: Date;
    job_type: string;
    work_model: string;
    city: string;
    state: string;
    country: string;
    experience_min: number;
    experience_max: number;
    salary_min: number;
    salary_max: number;
    currency: string;
    shift_type: string | null;
    education_level: string;
    required_skills: string[];
    search_keywords: string[];
    job_description: string;
    posted_by: string;
    employer: {
        company_logo_url: string | null;
        avatar_url: string | null;
        verified_employer: boolean;
    } | null;
};

type RecommendedJob = JobSummary & {
    ai_match_score: number;
    ai_reason: string;
};

type GeminiJobEvaluation = {
    jobId: string;
    shouldRecommend: boolean;
    reason: string;
};

type CandidateProfileRecord = {
    id: string;
    role: string;
    headline: string | null;
    bio: string | null;
    skills: unknown;
    experience: unknown;
    education: unknown;
    open_to_work: boolean;
    resume_url: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    current_job_title: string | null;
    current_company: string | null;
    total_experience: string | null;
    certifications: unknown;
    projects: unknown;
    portfolio_links: unknown;
    expected_salary: string | null;
    preferred_location: string | null;
};

const PROFILE_SELECT = {
    id: true,
    role: true,
    headline: true,
    bio: true,
    skills: true,
    experience: true,
    education: true,
    open_to_work: true,
    resume_url: true,
    city: true,
    state: true,
    country: true,
    current_job_title: true,
    current_company: true,
    total_experience: true,
    certifications: true,
    projects: true,
    portfolio_links: true,
    expected_salary: true,
    preferred_location: true,
} as const;

const MIN_RECOMMENDED_SCORE = 50;
const GEMINI_EVALUATION_CONCURRENCY = 3;
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_CANDIDATE_POOL_LIMIT = 12;

function limitText(value: string | null | undefined, maxLength: number) {
    if (!value) {
        return "";
    }

    const trimmed = value.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, maxLength - 3)}...`;
}

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getTextFragments(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((entry) => {
        if (typeof entry === "string") {
            return [entry];
        }

        if (typeof entry === "object" && entry !== null) {
            return Object.values(entry)
                .filter((field): field is string => typeof field === "string" && field.trim().length > 0);
        }

        return [];
    });
}

function normalizePhrase(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getNormalizedPhraseSet(values: string[]) {
    return [...new Set(values.map(normalizePhrase).filter(Boolean))];
}

function hasPhraseOverlap(sourceValues: string[], targetValues: string[]) {
    const sourceSet = getNormalizedPhraseSet(sourceValues);
    const targetSet = getNormalizedPhraseSet(targetValues);

    return targetSet.some((target) =>
        sourceSet.some((source) => source.includes(target) || target.includes(source))
    );
}

function parseNumberFromText(value: string) {
    const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    if (!match) {
        return null;
    }

    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function inferCandidateExperienceYears(profile: ReturnType<typeof getCandidateProfileSummary>) {
    const fromTotalExperience = parseNumberFromText(profile.total_experience);
    if (fromTotalExperience !== null) {
        return fromTotalExperience;
    }

    const years = getTextFragments(profile.experience)
        .map((value) => parseNumberFromText(value))
        .filter((value): value is number => value !== null);

    if (years.length === 0) {
        return null;
    }

    return Math.max(...years);
}

function inferPreferenceKeyword(profile: ReturnType<typeof getCandidateProfileSummary>, keywords: Record<string, string[]>) {
    const searchText = normalizePhrase([
        profile.headline,
        profile.bio,
        profile.preferred_location,
        profile.current_job_title,
        ...getTextFragments(profile.projects),
        ...getTextFragments(profile.experience),
    ].join(" "));

    for (const [label, variants] of Object.entries(keywords)) {
        if (variants.some((variant) => searchText.includes(variant))) {
            return label;
        }
    }

    return null;
}

function inferCandidateWorkModelPreference(profile: ReturnType<typeof getCandidateProfileSummary>) {
    return inferPreferenceKeyword(profile, {
        Remote: ["remote", "work from home", "wfh"],
        Hybrid: ["hybrid"],
        Onsite: ["onsite", "on site", "office"],
    });
}

function inferCandidateShiftPreference(profile: ReturnType<typeof getCandidateProfileSummary>) {
    return inferPreferenceKeyword(profile, {
        Day: ["day shift", "daytime", "morning shift"],
        Night: ["night shift", "overnight"],
        Rotational: ["rotational shift", "rotating shift", "rotation shift"],
        Flexible: ["flexible shift", "flexible timing", "any shift"],
    });
}

function isExperienceMatch(candidateYears: number | null, job: JobSummary) {
    if (candidateYears === null) {
        return false;
    }

    if (job.experience_max > 0) {
        return candidateYears >= job.experience_min && candidateYears <= job.experience_max;
    }

    return candidateYears >= job.experience_min;
}

function isSalaryMatch(expectedSalary: string, job: JobSummary) {
    const expectedSalaryNumber = parseNumberFromText(expectedSalary);
    if (expectedSalaryNumber === null || job.salary_max <= 0) {
        return false;
    }

    if (job.salary_min > 0) {
        return expectedSalaryNumber >= job.salary_min && expectedSalaryNumber <= job.salary_max;
    }

    return expectedSalaryNumber <= job.salary_max;
}

function isLocationMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const candidateLocation = [
        profile.preferred_location,
        profile.city,
        profile.state,
        profile.country,
    ].filter(Boolean);

    if (candidateLocation.length === 0) {
        return false;
    }

    return hasPhraseOverlap(candidateLocation, [job.city, job.state, job.country].filter(Boolean));
}

function isTitleMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const candidateTitles = [profile.current_job_title, profile.headline].filter(Boolean) as string[];
    if (candidateTitles.length === 0) {
        return false;
    }

    return hasPhraseOverlap(candidateTitles, [job.job_title]);
}

function isWorkModelMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const preference = inferCandidateWorkModelPreference(profile);
    if (!preference) {
        return false;
    }

    return normalizePhrase(preference) === normalizePhrase(job.work_model);
}

function isShiftMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    if (!job.shift_type) {
        return false;
    }

    const preference = inferCandidateShiftPreference(profile);
    if (!preference) {
        return false;
    }

    const normalizedShift = normalizePhrase(job.shift_type);
    return normalizedShift.includes(normalizePhrase(preference));
}

function isCertificationProjectMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const candidateProof = [
        ...getTextFragments(profile.certifications),
        ...getTextFragments(profile.projects),
        ...toStringArray(profile.portfolio_links),
    ];

    if (candidateProof.length === 0) {
        return false;
    }

    return hasPhraseOverlap(candidateProof, [
        ...job.required_skills,
        ...job.search_keywords,
        job.job_title,
    ]);
}

function isEducationMatch(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const educationEntries = getTextFragments(profile.education);
    if (educationEntries.length === 0 || !job.education_level || job.education_level === "Any") {
        return false;
    }

    return hasPhraseOverlap(educationEntries, [job.education_level]);
}

function getMatchedRequiredSkills(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const candidateSkills = toStringArray(profile.skills);
    if (candidateSkills.length === 0 || job.required_skills.length === 0) {
        return [];
    }

    const normalizedCandidateSkills = getNormalizedPhraseSet(candidateSkills);

    return job.required_skills.filter((requiredSkill) => {
        const normalizedRequiredSkill = normalizePhrase(requiredSkill);
        return normalizedCandidateSkills.some(
            (candidateSkill) =>
                candidateSkill.includes(normalizedRequiredSkill) ||
                normalizedRequiredSkill.includes(candidateSkill)
        );
    });
}

type LocalScoreBreakdown = {
    skills: number;
    salary: number;
    shiftTiming: number;
    experience: number;
    location: number;
    title: number;
    workModel: number;
    certificationsProjects: number;
    education: number;
    total: number;
    matchedSkills: string[];
};

function calculateStrictLocalScore(profile: ReturnType<typeof getCandidateProfileSummary>, job: JobSummary) {
    const matchedSkills = getMatchedRequiredSkills(profile, job);
    const skillScore = job.required_skills.length > 0
        ? Math.round((matchedSkills.length / job.required_skills.length) * 20)
        : 0;

    const salaryScore = isSalaryMatch(profile.expected_salary, job) ? 10 : 0;
    const shiftScore = isShiftMatch(profile, job) ? 10 : 0;
    const experienceScore = isExperienceMatch(inferCandidateExperienceYears(profile), job) ? 10 : 0;
    const locationScore = isLocationMatch(profile, job) ? 10 : 0;
    const titleScore = isTitleMatch(profile, job) ? 10 : 0;
    const workModelScore = isWorkModelMatch(profile, job) ? 10 : 0;
    const certificationsProjectsScore = isCertificationProjectMatch(profile, job) ? 10 : 0;
    const educationScore = isEducationMatch(profile, job) ? 10 : 0;

    const breakdown: LocalScoreBreakdown = {
        skills: skillScore,
        salary: salaryScore,
        shiftTiming: shiftScore,
        experience: experienceScore,
        location: locationScore,
        title: titleScore,
        workModel: workModelScore,
        certificationsProjects: certificationsProjectsScore,
        education: educationScore,
        total: skillScore + salaryScore + shiftScore + experienceScore + locationScore + titleScore + workModelScore + certificationsProjectsScore + educationScore,
        matchedSkills,
    };

    return breakdown;
}

function buildStrictReason(job: JobSummary, score: LocalScoreBreakdown) {
    const reasons: string[] = [];

    if (score.matchedSkills.length > 0) {
        reasons.push(`Skills matched: ${score.matchedSkills.slice(0, 3).join(", ")}`);
    }

    if (score.salary > 0) {
        reasons.push("Salary expectation aligns");
    }

    if (score.shiftTiming > 0) {
        reasons.push("Shift timing aligns");
    }

    if (score.experience > 0) {
        reasons.push("Experience range matches");
    }

    if (score.location > 0) {
        reasons.push("Location preference matches");
    }

    if (score.title > 0) {
        reasons.push("Role/title alignment is strong");
    }

    if (score.workModel > 0) {
        reasons.push("Work model preference matches");
    }

    if (score.certificationsProjects > 0) {
        reasons.push("Projects or certifications support the role");
    }

    if (score.education > 0) {
        reasons.push("Education requirement matches");
    }

    if (reasons.length === 0) {
        reasons.push(`Strict scoring found no strong alignment for ${job.job_title}`);
    }

    return reasons.join(". ");
}

function getCandidateProfileSummary(profile: CandidateProfileRecord) {
    return {
        headline: profile?.headline || "",
        bio: limitText(profile?.bio, 1500),
        skills: toStringArray(profile?.skills),
        experience: Array.isArray(profile?.experience) ? profile?.experience : [],
        education: Array.isArray(profile?.education) ? profile?.education : [],
        open_to_work: Boolean(profile?.open_to_work),
        city: profile?.city || "",
        state: profile?.state || "",
        country: profile?.country || "",
        current_job_title: profile?.current_job_title || "",
        current_company: profile?.current_company || "",
        total_experience: profile?.total_experience || "",
        certifications: Array.isArray(profile?.certifications) ? profile?.certifications : [],
        projects: Array.isArray(profile?.projects) ? profile?.projects : [],
        portfolio_links: Array.isArray(profile?.portfolio_links) ? profile?.portfolio_links : [],
        expected_salary: profile?.expected_salary || "",
        preferred_location: profile?.preferred_location || "",
    };
}

function getJobPromptSummary(job: JobSummary) {
    return {
        id: job.id,
        title: job.job_title,
        company: job.company_name,
        created_at: job.created_at.toISOString(),
        location: [job.city, job.state, job.country].filter(Boolean).join(", "),
        job_type: job.job_type,
        work_model: job.work_model,
        experience_min: job.experience_min,
        experience_max: job.experience_max,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        currency: job.currency,
        shift_type: job.shift_type,
        education_level: job.education_level,
        required_skills: job.required_skills,
        search_keywords: job.search_keywords,
        description: limitText(job.job_description, 1200),
    };
}

function extractGeminiText(payload: unknown) {
    if (
        typeof payload !== "object" ||
        payload === null ||
        !("candidates" in payload) ||
        !Array.isArray(payload.candidates)
    ) {
        return null;
    }

    const firstCandidate = payload.candidates[0];
    if (
        typeof firstCandidate !== "object" ||
        firstCandidate === null ||
        !("content" in firstCandidate)
    ) {
        return null;
    }

    const content = firstCandidate.content;
    if (
        typeof content !== "object" ||
        content === null ||
        !("parts" in content) ||
        !Array.isArray(content.parts)
    ) {
        return null;
    }

    const text = content.parts
        .map((part: unknown) => {
            if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
                return part.text;
            }

            return "";
        })
        .join("")
        .trim();

    return text || null;
}

function parseGeminiEvaluation(rawText: string) {
    try {
        return JSON.parse(rawText) as GeminiJobEvaluation;
    } catch {
        const objectMatch = rawText.match(/\{[\s\S]*\}/);
        if (!objectMatch) {
            return null;
        }

        try {
            return JSON.parse(objectMatch[0]) as GeminiJobEvaluation;
        } catch {
            return null;
        }
    }
}

function getFallbackRecommendations(profile: ReturnType<typeof getCandidateProfileSummary>, jobs: JobSummary[], limit: number) {
    return jobs
        .map((job) => {
            const score = calculateStrictLocalScore(profile, job);

            return {
                ...job,
                ai_match_score: score.total,
                ai_reason: buildStrictReason(job, score),
            };
        })
        .filter((job) => job.ai_match_score > MIN_RECOMMENDED_SCORE)
        .sort((a, b) => b.ai_match_score - a.ai_match_score)
        .slice(0, limit);
}

async function evaluateJobWithGemini(options: {
    profile: ReturnType<typeof getCandidateProfileSummary>;
    job: JobSummary;
    localScore: LocalScoreBreakdown;
    resume: Awaited<ReturnType<typeof readStoredResumeFileByUrl>> | null;
}) {
    if (getGeminiApiKeys().length === 0) {
        console.warn("[Jobs Recommended] No Gemini API keys are configured. Using fallback recommendations.");
        return null;
    }

    const prompt = [
        "You are Talorix's strict AI job-fit evaluator.",
        "Evaluate ONE candidate against ONE job only.",
        "Be conservative and strict.",
        `The final percentage score is already calculated by the backend using a fixed rubric. Do not recalculate it.`,
        `Only review whether this job should be recommended for this candidate given the strict backend score of ${options.localScore.total}%.`,
        `Only recommend the job if the fit score is greater than ${MIN_RECOMMENDED_SCORE}.`,
        `If the backend score is ${MIN_RECOMMENDED_SCORE} or lower, you must set shouldRecommend to false.`,
        "Do not inflate scores just to return a recommendation.",
        "Strongly penalize missing required skills, weak title alignment, mismatched experience, and mismatched location/work model.",
        "If the candidate is only loosely related, assign a low score and reject the recommendation.",
        "Use the candidate profile JSON and the attached resume file if present.",
        "Return concise reasoning grounded only in the supplied data.",
        "",
        "Candidate profile JSON:",
        JSON.stringify(options.profile),
        "",
        "Job JSON:",
        JSON.stringify(getJobPromptSummary(options.job)),
        "",
        "Backend score breakdown JSON:",
        JSON.stringify(options.localScore),
    ].join("\n");

    const parts: Array<Record<string, unknown>> = [
        { text: prompt },
    ];

    if (options.resume) {
        parts.push({
            inline_data: {
                mime_type: options.resume.mimeType,
                data: options.resume.buffer.toString("base64"),
            },
        });
    }

    const result = await generateGeminiContentWithRotation({
        model: "gemini-2.5-flash",
        timeoutMs: GEMINI_TIMEOUT_MS,
        requestLabel: `[Jobs Recommended] job ${options.job.id}`,
        body: {
            contents: [{ parts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    properties: {
                        jobId: { type: "string" },
                        shouldRecommend: { type: "boolean" },
                        reason: { type: "string" },
                    },
                    required: ["jobId", "shouldRecommend", "reason"],
                },
                temperature: 0.2,
                maxOutputTokens: 600,
            },
        },
    });

    if (!result) {
        return null;
    }

    const payload = result.payload;
    const rawText = extractGeminiText(payload);
    if (!rawText) {
        console.error("[Jobs Recommended] Gemini response did not contain text output.", payload);
        return null;
    }

    const parsed = parseGeminiEvaluation(rawText);
    if (
        !parsed ||
        typeof parsed.jobId !== "string" ||
        typeof parsed.shouldRecommend !== "boolean" ||
        typeof parsed.reason !== "string"
    ) {
        console.error("[Jobs Recommended] Gemini response JSON was invalid.", rawText);
        return null;
    }

    return parsed;
}

async function getStrictGeminiRecommendations(options: {
    profile: ReturnType<typeof getCandidateProfileSummary>;
    jobs: JobSummary[];
    limit: number;
    resume: Awaited<ReturnType<typeof readStoredResumeFileByUrl>> | null;
}) {
    const scoredJobs = options.jobs
        .map((job) => ({
            job,
            score: calculateStrictLocalScore(options.profile, job),
        }))
        .filter(({ score }) => score.total > MIN_RECOMMENDED_SCORE)
        .sort((a, b) => b.score.total - a.score.total)
        .slice(0, GEMINI_CANDIDATE_POOL_LIMIT);

    if (scoredJobs.length === 0) {
        return [];
    }

    const evaluations: GeminiJobEvaluation[] = [];

    for (let index = 0; index < scoredJobs.length; index += GEMINI_EVALUATION_CONCURRENCY) {
        const batch = scoredJobs.slice(index, index + GEMINI_EVALUATION_CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map(({ job, score }) =>
                evaluateJobWithGemini({
                    profile: options.profile,
                    job,
                    localScore: score,
                    resume: options.resume,
                }).catch((error) => {
                    console.error("[Jobs Recommended] Unexpected per-job Gemini evaluation error.", {
                        jobId: job.id,
                        error,
                    });
                    return null;
                })
            )
        );

        evaluations.push(
            ...batchResults.filter((result): result is GeminiJobEvaluation => result !== null)
        );
    }

    return evaluations
        .filter((result) => result.shouldRecommend)
        .slice(0, options.limit);
}

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "candidate") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const requestedLimit = Number.parseInt(searchParams.get("limit") || "3", 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 6)
            : 3;

        const [profile, jobs] = await Promise.all([
            db.user.findUnique({
                where: { id: session.userId },
                select: PROFILE_SELECT,
            }),
            db.job.findMany({
                where: {
                    status: "ACTIVE",
                    employer: { is_suspended: false },
                },
                orderBy: { created_at: "desc" },
                select: {
                    id: true,
                    job_title: true,
                    company_name: true,
                    created_at: true,
                    job_type: true,
                    work_model: true,
                    city: true,
                    state: true,
                    country: true,
                    experience_min: true,
                    experience_max: true,
                    salary_min: true,
                    salary_max: true,
                    currency: true,
                    shift_type: true,
                    education_level: true,
                    required_skills: true,
                    search_keywords: true,
                    job_description: true,
                    posted_by: true,
                    employer: {
                        select: {
                            company_logo_url: true,
                            avatar_url: true,
                            verified_employer: true,
                        },
                    },
                },
            }),
        ]);

        if (!profile || profile.role !== "candidate") {
            return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 });
        }

        if (jobs.length === 0) {
            return NextResponse.json({ jobs: [], source: "empty" });
        }

        const normalizedJobs: JobSummary[] = jobs.map((job) => ({
            ...job,
            required_skills: toStringArray(job.required_skills),
            search_keywords: toStringArray(job.search_keywords),
            job_description: job.job_description || "",
        }));

        const profileSummary = getCandidateProfileSummary(profile);
        const resume = profile.resume_url
            ? await readStoredResumeFileByUrl(profile.resume_url).catch((error) => {
                console.error("[Jobs Recommended] Failed to read stored resume file.", error);
                return null;
            })
            : null;

        const geminiRecommendations = await getStrictGeminiRecommendations({
            profile: profileSummary,
            jobs: normalizedJobs,
            limit,
            resume,
        }).catch((error) => {
            console.error("[Jobs Recommended] Unexpected Gemini strict recommendation error.", error);
            return null;
        });

        const jobMap = new Map(normalizedJobs.map((job) => [job.id, job]));

        const recommendedJobs: RecommendedJob[] = geminiRecommendations
            ? geminiRecommendations
                .map((recommendation) => {
                    const job = jobMap.get(recommendation.jobId);
                    if (!job) {
                        return null;
                    }

                    const score = calculateStrictLocalScore(profileSummary, job);
                    if (score.total <= MIN_RECOMMENDED_SCORE) {
                        return null;
                    }

                    return {
                        ...job,
                        ai_match_score: score.total,
                        ai_reason: limitText(recommendation.reason, 220),
                    };
                })
                .filter((job): job is RecommendedJob => job !== null)
                .slice(0, limit)
            : [];

        if (recommendedJobs.length > 0) {
            return NextResponse.json({ jobs: recommendedJobs, source: "gemini" });
        }

        const fallbackJobs = getFallbackRecommendations(profileSummary, normalizedJobs, limit);
        return NextResponse.json({ jobs: fallbackJobs, source: "fallback" });
    } catch (error) {
        console.error("[Jobs Recommended] Route error:", error);
        return NextResponse.json({ error: "Failed to generate recommended jobs" }, { status: 500 });
    }
}
