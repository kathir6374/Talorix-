import { db } from "@/lib/db";
import { sendJobMatchNotificationEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/app-url";

const MIN_MATCH_SCORE = 50;
const MAX_CANDIDATE_POOL = 250;
const MAX_NOTIFICATIONS_PER_JOB = 50;
const EMAIL_CONCURRENCY = 5;

type CandidateRecord = {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    bio: string | null;
    skills: unknown;
    experience: unknown;
    education: unknown;
    city: string | null;
    state: string | null;
    country: string | null;
    current_job_title: string | null;
    total_experience: string | null;
    certifications: unknown;
    projects: unknown;
    expected_salary: string | null;
    preferred_location: string | null;
};

type JobRecord = {
    id: string;
    status: string;
    job_title: string;
    job_description: string;
    company_name: string;
    job_category: string;
    job_type: string;
    work_model: string;
    city: string;
    state: string;
    country: string;
    salary_min: number;
    salary_max: number;
    experience_min: number;
    experience_max: number;
    education_level: string;
    required_skills: unknown;
    search_keywords: unknown;
    shift_type: string | null;
};

type MatchBreakdown = {
    skills: number;
    role: number;
    experience: number;
    profileKeywords: number;
    location: number;
    workModel: number;
    salary: number;
    education: number;
    total: number;
    matchedSkills: string[];
};

const JOB_SELECT = {
    id: true,
    status: true,
    job_title: true,
    job_description: true,
    company_name: true,
    job_category: true,
    job_type: true,
    work_model: true,
    city: true,
    state: true,
    country: true,
    salary_min: true,
    salary_max: true,
    experience_min: true,
    experience_max: true,
    education_level: true,
    required_skills: true,
    search_keywords: true,
    shift_type: true,
} as const;

const CANDIDATE_SELECT = {
    id: true,
    name: true,
    email: true,
    headline: true,
    bio: true,
    skills: true,
    experience: true,
    education: true,
    city: true,
    state: true,
    country: true,
    current_job_title: true,
    total_experience: true,
    certifications: true,
    projects: true,
    expected_salary: true,
    preferred_location: true,
} as const;

function toStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }

    if (typeof value === "string") {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return [];
}

function getTextFragments(value: unknown): string[] {
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

function getNormalizedPhrases(values: string[]) {
    return [...new Set(values.map(normalizePhrase).filter(Boolean))];
}

function hasPhraseOverlap(sourceValues: string[], targetValues: string[]) {
    const sourcePhrases = getNormalizedPhrases(sourceValues);
    const targetPhrases = getNormalizedPhrases(targetValues);

    return targetPhrases.some((target) =>
        sourcePhrases.some((source) => source.includes(target) || target.includes(source))
    );
}

function parseNumberFromText(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    if (!match) {
        return null;
    }

    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function inferExperienceYears(candidate: CandidateRecord) {
    const totalExperience = parseNumberFromText(candidate.total_experience);
    if (totalExperience !== null) {
        return totalExperience;
    }

    const years = getTextFragments(candidate.experience)
        .map(parseNumberFromText)
        .filter((value): value is number => value !== null);

    return years.length > 0 ? Math.max(...years) : null;
}

function getMatchedSkills(candidate: CandidateRecord, job: JobRecord) {
    const candidateSkills = getNormalizedPhrases(toStringArray(candidate.skills));
    const requiredSkills = toStringArray(job.required_skills);

    if (candidateSkills.length === 0 || requiredSkills.length === 0) {
        return [];
    }

    return requiredSkills.filter((skill) => {
        const normalizedSkill = normalizePhrase(skill);
        return candidateSkills.some(
            (candidateSkill) =>
                candidateSkill.includes(normalizedSkill) ||
                normalizedSkill.includes(candidateSkill)
        );
    });
}

function isExperienceMatch(candidateYears: number | null, job: JobRecord) {
    if (candidateYears === null) {
        return false;
    }

    if (job.experience_max > 0) {
        return candidateYears >= job.experience_min && candidateYears <= job.experience_max;
    }

    return candidateYears >= job.experience_min;
}

function isLocationMatch(candidate: CandidateRecord, job: JobRecord) {
    const candidateLocations = [
        candidate.preferred_location,
        candidate.city,
        candidate.state,
        candidate.country,
    ].filter(Boolean) as string[];

    if (candidateLocations.length === 0) {
        return normalizePhrase(job.work_model).includes("remote");
    }

    return hasPhraseOverlap(candidateLocations, [job.city, job.state, job.country, job.work_model].filter(Boolean));
}

function isWorkModelMatch(candidate: CandidateRecord, job: JobRecord) {
    const preferences = normalizePhrase([
        candidate.preferred_location,
        candidate.bio,
        candidate.headline,
    ].filter(Boolean).join(" "));

    const jobWorkModel = normalizePhrase(job.work_model);

    return (
        (jobWorkModel.includes("remote") && /remote|work from home|wfh/.test(preferences)) ||
        (jobWorkModel.includes("hybrid") && preferences.includes("hybrid")) ||
        (jobWorkModel.includes("onsite") && /onsite|on site|office/.test(preferences))
    );
}

function isSalaryMatch(candidate: CandidateRecord, job: JobRecord) {
    const expectedSalary = parseNumberFromText(candidate.expected_salary);
    if (expectedSalary === null || job.salary_max <= 0) {
        return false;
    }

    if (job.salary_min > 0) {
        return expectedSalary >= job.salary_min && expectedSalary <= job.salary_max;
    }

    return expectedSalary <= job.salary_max;
}

function isEducationMatch(candidate: CandidateRecord, job: JobRecord) {
    if (!job.education_level || job.education_level === "Any") {
        return false;
    }

    return hasPhraseOverlap(getTextFragments(candidate.education), [job.education_level]);
}

function isRoleMatch(candidate: CandidateRecord, job: JobRecord) {
    const candidateRoles = [
        candidate.current_job_title,
        candidate.headline,
        ...getTextFragments(candidate.experience),
    ].filter(Boolean) as string[];

    return hasPhraseOverlap(candidateRoles, [job.job_title, job.job_category]);
}

function isProfileKeywordMatch(candidate: CandidateRecord, job: JobRecord) {
    const candidateProfileText = [
        candidate.bio,
        candidate.headline,
        candidate.current_job_title,
        ...getTextFragments(candidate.experience),
        ...getTextFragments(candidate.certifications),
        ...getTextFragments(candidate.projects),
    ].filter(Boolean) as string[];

    const jobKeywords = [
        job.job_title,
        job.job_category,
        job.job_description,
        ...toStringArray(job.required_skills),
        ...toStringArray(job.search_keywords),
    ];

    return hasPhraseOverlap(candidateProfileText, jobKeywords);
}

function calculateCandidateJobMatch(candidate: CandidateRecord, job: JobRecord) {
    const matchedSkills = getMatchedSkills(candidate, job);
    const requiredSkills = toStringArray(job.required_skills);

    const skills = requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 30)
        : 0;
    const role = isRoleMatch(candidate, job) ? 20 : 0;
    const experience = isExperienceMatch(inferExperienceYears(candidate), job) ? 15 : 0;
    const profileKeywords = isProfileKeywordMatch(candidate, job) ? 10 : 0;
    const location = isLocationMatch(candidate, job) ? 10 : 0;
    const workModel = isWorkModelMatch(candidate, job) ? 5 : 0;
    const salary = isSalaryMatch(candidate, job) ? 5 : 0;
    const education = isEducationMatch(candidate, job) ? 5 : 0;

    const breakdown: MatchBreakdown = {
        skills,
        role,
        experience,
        profileKeywords,
        location,
        workModel,
        salary,
        education,
        total: skills + role + experience + profileKeywords + location + workModel + salary + education,
        matchedSkills,
    };

    return breakdown;
}

function buildMatchReason(match: MatchBreakdown) {
    const reasons: string[] = [];

    if (match.matchedSkills.length > 0) {
        reasons.push(`Matched skills: ${match.matchedSkills.slice(0, 4).join(", ")}`);
    }

    if (match.role > 0) reasons.push("role alignment");
    if (match.experience > 0) reasons.push("experience fit");
    if (match.location > 0) reasons.push("location preference");
    if (match.profileKeywords > 0) reasons.push("profile details align with the job");

    return reasons.length > 0
        ? reasons.join(", ")
        : "Your profile closely matches this new job opening.";
}

function getJobUrl(jobId: string) {
    return `${getAppBaseUrl()}/jobs/${jobId}`;
}

async function sendInBatches<T>(items: T[], handler: (item: T) => Promise<boolean>) {
    let sent = 0;
    let failed = 0;

    for (let index = 0; index < items.length; index += EMAIL_CONCURRENCY) {
        const batch = items.slice(index, index + EMAIL_CONCURRENCY);
        const results = await Promise.all(batch.map(handler));

        sent += results.filter(Boolean).length;
        failed += results.filter((result) => !result).length;
    }

    return { sent, failed };
}

export async function sendJobMatchNotificationsForJob(jobId: string) {
    const job = await db.job.findUnique({
        where: { id: jobId },
        select: JOB_SELECT,
    });

    if (!job || job.status !== "ACTIVE") {
        return { evaluated: 0, matched: 0, sent: 0, failed: 0 };
    }

    const candidates = await db.user.findMany({
        where: {
            role: "candidate",
            is_suspended: false,
            open_to_work: true,
            email: { not: "" },
        },
        select: CANDIDATE_SELECT,
        orderBy: { created_at: "desc" },
        take: MAX_CANDIDATE_POOL,
    });

    const matches = candidates
        .map((candidate) => ({
            candidate,
            match: calculateCandidateJobMatch(candidate, job),
        }))
        .filter(({ match }) => (
            match.total >= MIN_MATCH_SCORE &&
            (match.matchedSkills.length > 0 || match.role > 0 || match.profileKeywords > 0)
        ))
        .sort((a, b) => b.match.total - a.match.total)
        .slice(0, MAX_NOTIFICATIONS_PER_JOB);

    if (matches.length === 0) {
        console.log("[Job Match] No candidate notification matches found.", {
            jobId: job.id,
            jobTitle: job.job_title,
            evaluated: candidates.length,
        });
        return { evaluated: candidates.length, matched: 0, sent: 0, failed: 0 };
    }

    const jobLocation = [job.city, job.state, job.country].filter(Boolean).join(", ");
    const jobUrl = getJobUrl(job.id);

    const delivery = await sendInBatches(matches, ({ candidate, match }) =>
        sendJobMatchNotificationEmail({
            to: candidate.email,
            candidateName: candidate.name || "Candidate",
            jobTitle: job.job_title,
            companyName: job.company_name,
            jobLocation,
            jobType: job.job_type,
            jobUrl,
            matchScore: match.total,
            matchReason: buildMatchReason(match),
        })
    );

    console.log("[Job Match] Candidate notifications completed.", {
        jobId: job.id,
        jobTitle: job.job_title,
        evaluated: candidates.length,
        matched: matches.length,
        sent: delivery.sent,
        failed: delivery.failed,
    });

    return {
        evaluated: candidates.length,
        matched: matches.length,
        sent: delivery.sent,
        failed: delivery.failed,
    };
}
