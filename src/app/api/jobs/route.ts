import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendJobMatchNotificationsForJob } from "@/lib/job-match-notifications";

const normalizeSearchText = (value: unknown) =>
    typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "";

const extractSearchTerms = (query: string) =>
    normalizeSearchText(query)
        .split(/[\s,/]+/)
        .map((term) => term.trim())
        .filter(Boolean);

const extractJsonStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => extractJsonStringArray(item));
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return [];
        }

        if ((trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) || (trimmedValue.startsWith("{") && trimmedValue.endsWith("}"))) {
            try {
                return extractJsonStringArray(JSON.parse(trimmedValue));
            } catch {
                return [trimmedValue];
            }
        }

        return [trimmedValue];
    }

    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).flatMap((item) => extractJsonStringArray(item));
    }

    return [];
};

const matchesSearchQuery = (query: string, values: string[]) => {
    const normalizedQuery = normalizeSearchText(query);

    if (!normalizedQuery) {
        return true;
    }

    const normalizedValues = values.map((value) => normalizeSearchText(value)).filter(Boolean);
    const terms = extractSearchTerms(normalizedQuery);

    const hasFullQueryMatch = normalizedValues.some((value) => value.includes(normalizedQuery));
    const hasAllTermMatches =
        terms.length > 0 &&
        terms.every((term) => normalizedValues.some((value) => value.includes(term)));

    return hasFullQueryMatch || hasAllTermMatches;
};

const countTermMatches = (terms: string[], values: string[]) => {
    const normalizedValues = values.map((value) => normalizeSearchText(value)).filter(Boolean);

    return terms.reduce((count, term) => {
        if (normalizedValues.some((value) => value.includes(term))) {
            return count + 1;
        }

        return count;
    }, 0);
};

const getJobSearchBuckets = (job: any) => {
    const locationValues = [job.city, job.state, job.country, job.work_model].filter(Boolean);
    const formattedLocation = [job.city, job.state, job.country].filter(Boolean).join(", ");
    const skills = extractJsonStringArray(job.required_skills);
    const keywords = extractJsonStringArray(job.search_keywords);

    return {
        titleValues: [job.job_title],
        skillValues: skills,
        companyValues: [job.company_name],
        locationValues: [...locationValues, formattedLocation],
        keywordValues: keywords,
        supportingValues: [job.job_description, job.job_category, job.job_type, job.work_model],
    };
};

const getJobRelevanceScore = (job: any, search: string, location: string) => {
    const normalizedSearch = normalizeSearchText(search);
    const normalizedLocation = normalizeSearchText(location);
    const searchTerms = extractSearchTerms(normalizedSearch);
    const locationTerms = extractSearchTerms(normalizedLocation);

    const {
        titleValues,
        skillValues,
        companyValues,
        locationValues,
        keywordValues,
        supportingValues,
    } = getJobSearchBuckets(job);

    let score = 0;

    if (normalizedSearch) {
        if (matchesSearchQuery(normalizedSearch, titleValues)) score += 120;
        if (matchesSearchQuery(normalizedSearch, skillValues)) score += 110;
        if (matchesSearchQuery(normalizedSearch, companyValues)) score += 100;
        if (matchesSearchQuery(normalizedSearch, keywordValues)) score += 95;
        if (matchesSearchQuery(normalizedSearch, locationValues)) score += 80;
        if (matchesSearchQuery(normalizedSearch, supportingValues)) score += 70;

        score += countTermMatches(searchTerms, titleValues) * 18;
        score += countTermMatches(searchTerms, skillValues) * 16;
        score += countTermMatches(searchTerms, companyValues) * 14;
        score += countTermMatches(searchTerms, keywordValues) * 12;
        score += countTermMatches(searchTerms, locationValues) * 10;
        score += countTermMatches(searchTerms, supportingValues) * 8;
    }

    if (normalizedLocation) {
        if (matchesSearchQuery(normalizedLocation, locationValues)) score += 120;
        score += countTermMatches(locationTerms, locationValues) * 18;
    }

    return score;
};

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await verifyAuth(token.value);

        if (!session || session.role !== "employer") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            job_title,
            job_description,
            company_name,
            job_category,
            job_type,
            work_model,
            country,
            state,
            city,
            salary_type,
            salary_min,
            salary_max,
            currency,
            experience_min,
            experience_max,
            education_level,
            required_skills,
            openings,
            shift_type,
            benefits,
            application_deadline,
            hr_contact_name,
            hr_contact_phone,
            external_apply_url,
            search_keywords,
            ai_interview_questions,
        } = body;

        if (!job_title || !job_description || !company_name) {
            return NextResponse.json({ error: "Missing required Core fields" }, { status: 400 });
        }

        const parsedSalaryMin = parseInt(salary_min) || 0;
        const parsedSalaryMax = parseInt(salary_max) || 0;
        const parsedExpMin = parseInt(experience_min) || 0;
        const parsedExpMax = parseInt(experience_max) || 0;
        const parsedOpenings = parseInt(openings) || 1;

        let skillsArray: string[] = [];
        try {
            if (typeof required_skills === 'string') {
                skillsArray = required_skills.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(required_skills)) {
                skillsArray = required_skills;
            }
        } catch (e) { }

        let benefitsArray: string[] = [];
        try {
            if (typeof benefits === 'string') {
                benefitsArray = benefits.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(benefits)) {
                benefitsArray = benefits;
            }
        } catch (e) { }

        let keywordsArray: string[] = [];
        try {
            if (typeof search_keywords === 'string') {
                keywordsArray = search_keywords.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(search_keywords)) {
                keywordsArray = search_keywords;
            }
        } catch (e) { }

        let aiQuestionsArray: string[] = [];
        try {
            if (typeof ai_interview_questions === 'string') {
                aiQuestionsArray = ai_interview_questions.split('\n').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(ai_interview_questions)) {
                aiQuestionsArray = ai_interview_questions;
            }
        } catch (e) { }

        const job = await db.job.create({
            data: {
                status: "ACTIVE",
                job_title,
                job_description,
                company_name,
                job_category: job_category || "Uncategorized",
                job_type: job_type || "Full-time",
                work_model: work_model || "Onsite",
                country: country || "",
                state: state || "",
                city: city || "",
                salary_type: salary_type || "Yearly",
                salary_min: parsedSalaryMin,
                salary_max: parsedSalaryMax,
                currency: currency || "USD",
                experience_min: parsedExpMin,
                experience_max: parsedExpMax,
                education_level: education_level || "Any",
                required_skills: skillsArray,
                openings: parsedOpenings,
                shift_type: shift_type || null,
                benefits: benefitsArray,
                application_deadline: application_deadline ? new Date(application_deadline) : null,
                hr_contact_name: hr_contact_name || "",
                hr_contact_phone: hr_contact_phone || "",
                external_apply_url: external_apply_url || null,
                search_keywords: keywordsArray,
                ai_interview_questions: aiQuestionsArray,
                posted_by: session.userId,
            },
        });

        after(async () => {
            try {
                await sendJobMatchNotificationsForJob(job.id);
            } catch (error) {
                console.error("Job match notification error:", error);
            }
        });

        return NextResponse.json({ message: "Job created successfully", job }, { status: 201 });
    } catch (error) {
        console.error("Job Creation Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search")?.trim() || "";
        const locationStr = searchParams.get("location")?.trim() || "";
        const job_type = searchParams.get("job_type");
        const work_model = searchParams.get("work_model");
        const experience = searchParams.get("experience");
        const salaryParams = searchParams.get("salary_min");
        const sortBy = searchParams.get("sortBy") || "newest";

        const pageParam = parseInt(searchParams.get("page") || "1", 10);
        const limitParam = parseInt(searchParams.get("limit") || "9", 10);
        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 9;
        const skip = (page - 1) * limit;

        const experienceValue = Number.parseInt(experience || "", 10);
        const salaryValue = Number.parseInt(salaryParams || "", 10);

        const baseWhereClause: any = {
            status: "ACTIVE",
            employer: {
                is_suspended: false
            },
            ...(job_type ? { job_type } : {}),
            ...(work_model ? { work_model } : {}),
            ...(Number.isFinite(experienceValue) ? { experience_min: { lte: experienceValue } } : {}),
            ...(Number.isFinite(salaryValue) ? { salary_max: { gte: salaryValue } } : {}),
        };

        const jobs = await db.job.findMany({
            where: baseWhereClause,
            include: {
                employer: {
                    select: {
                        verified_employer: true,
                        avatar_url: true,
                        company_logo_url: true,
                    }
                }
            },
        });

        const filteredJobs = jobs.filter((job) => {
            const {
                titleValues,
                skillValues,
                companyValues,
                locationValues,
                keywordValues,
                supportingValues,
            } = getJobSearchBuckets(job);

            const searchValues = [
                ...titleValues,
                ...skillValues,
                ...companyValues,
                ...locationValues,
                ...keywordValues,
                ...supportingValues,
            ];

            const matchesSearch = matchesSearchQuery(search, searchValues);
            const matchesLocation = matchesSearchQuery(locationStr, locationValues);

            return matchesSearch && matchesLocation;
        });

        const sortedJobs = [...filteredJobs].sort((firstJob, secondJob) => {
            if (sortBy === "highest_salary") {
                return secondJob.salary_max - firstJob.salary_max;
            }

            if (sortBy === "relevant") {
                const secondScore = getJobRelevanceScore(secondJob, search, locationStr);
                const firstScore = getJobRelevanceScore(firstJob, search, locationStr);

                if (secondScore !== firstScore) {
                    return secondScore - firstScore;
                }
            }

            return new Date(secondJob.created_at).getTime() - new Date(firstJob.created_at).getTime();
        });

        const totalJobs = sortedJobs.length;
        const paginatedJobs = sortedJobs.slice(skip, skip + limit);

        return NextResponse.json({
            jobs: paginatedJobs,
            pagination: {
                total: totalJobs,
                page,
                limit,
                totalPages: Math.ceil(totalJobs / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error("Job Fetch Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
