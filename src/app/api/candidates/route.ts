import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getEmployerSubscriptionSnapshot } from "@/lib/employer-subscriptions";

const normalizeCandidateText = (value: unknown) =>
    typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "";

const splitSearchTerms = (value: string) =>
    normalizeCandidateText(value)
        .split(/[\s,/]+/)
        .map((term) => term.trim())
        .filter(Boolean);

const extractJsonStrings = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => extractJsonStrings(item));
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (!trimmedValue) return [];
        return [trimmedValue];
    }

    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).flatMap((item) => extractJsonStrings(item));
    }

    return [];
};

const extractYears = (value: string | null | undefined) => {
    if (!value) return 0;

    const matches = value.match(/\d+(\.\d+)?/g);
    if (!matches || matches.length === 0) {
        return 0;
    }

    return Math.max(...matches.map((match) => Number.parseFloat(match)).filter((number) => Number.isFinite(number)));
};

const valuesMatchQuery = (query: string, values: string[]) => {
    const normalizedQuery = normalizeCandidateText(query);
    if (!normalizedQuery) return true;

    const normalizedValues = values.map((value) => normalizeCandidateText(value)).filter(Boolean);
    const terms = splitSearchTerms(normalizedQuery);

    const matchesFullQuery = normalizedValues.some((value) => value.includes(normalizedQuery));
    const matchesAllTerms =
        terms.length > 0 &&
        terms.every((term) => normalizedValues.some((value) => value.includes(term)));

    return matchesFullQuery || matchesAllTerms;
};

const getCandidateTopScore = (candidate: any) => {
    const score = candidate.interviewAttempts?.[0]?.score;
    return typeof score === "number" ? score : -1;
};

const getCandidateExperienceYears = (candidate: any) => {
    const directExperience = extractYears(candidate.total_experience);
    if (directExperience > 0) {
        return directExperience;
    }

    const experienceEntries = Array.isArray(candidate.experience) ? candidate.experience : [];
    const derivedExperience = experienceEntries
        .map((entry: any) => extractYears(typeof entry?.duration === "string" ? entry.duration : typeof entry?.years === "string" ? entry.years : ""))
        .filter((years: number) => years > 0);

    return derivedExperience.length > 0 ? Math.max(...derivedExperience) : 0;
};

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await verifyAuth(token.value);
        if (!session || session.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const subscriptionSnapshot = await getEmployerSubscriptionSnapshot(session.userId);
        if (subscriptionSnapshot.monetizationEnabled && !subscriptionSnapshot.capabilities.canSourceCandidates) {
            return NextResponse.json({
                error: "Your current employer plan does not include candidate directory access. Please upgrade to continue.",
            }, { status: 403 });
        }
        const canAccessCandidateContact = !subscriptionSnapshot.monetizationEnabled || subscriptionSnapshot.capabilities.canContactCandidates;
        const canAccessAiFeatures = !subscriptionSnapshot.monetizationEnabled || subscriptionSnapshot.capabilities.canAccessAiFeatures;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search")?.trim() || "";
        const skills = searchParams.get("skills")?.trim() || "";
        const location = searchParams.get("location")?.trim() || "";
        const experience = searchParams.get("experience")?.trim() || "";
        const education = searchParams.get("education")?.trim() || "";
        const openToWorkOnly = searchParams.get("openToWork") === "true";
        const role = searchParams.get("role")?.trim() || "";
        const sortBy = searchParams.get("sortBy") || "score"; // score, newest, experience
        const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
        const responseLimit = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(limitParam, 100)
            : null;
        const aiRecommendedOnlyFlag = searchParams.get("aiRecommended") === "true";

        if (aiRecommendedOnlyFlag && !canAccessAiFeatures) {
            return NextResponse.json({
                error: "Your current employer plan does not include AI candidate discovery. Please upgrade to continue.",
            }, { status: 403 });
        }

        const whereClause: any = {
            role: "candidate",
            is_suspended: false,
        };

        if (openToWorkOnly) {
            whereClause.open_to_work = true;
        }

        const candidates = await db.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                headline: true,
                avatar_url: true,
                gender: true,
                skills: true,
                open_to_work: true,
                experience: true,
                education: true,
                city: true,
                state: true,
                country: true,
                current_job_title: true,
                current_company: true,
                total_experience: true,
                created_at: true,
                phone: true,
                // @ts-ignore
                ai_rank: true,
                // @ts-ignore
                ai_percentile: true,
                // @ts-ignore
                ai_confidence_score: true,
                // @ts-ignore
                ai_concept_coverage: true,
                // @ts-ignore
                ai_feedback_summary: true,
                // @ts-ignore
                skill_rank: true,
                // @ts-ignore
                skill_percentile: true,
                // @ts-ignore
                availability_status: true,
                // @ts-ignore
                available_in_days: true,
                profile_views: true,
                interviewAttempts: {
                    select: {
                        score: true,
                        // @ts-ignore: Prisma client type cache lag
                        role_tested_for: true,
                        created_at: true,
                        job_id: true,
                        communication_score: true,
                        // @ts-ignore
                        technical_score: true,
                        // @ts-ignore
                        keyword_matches: true,
                    },
                    orderBy: {
                        score: 'desc'
                    },
                    take: 1,
                }
            },
            orderBy: sortBy === "newest" 
                ? [{ created_at: 'desc' }]
                : sortBy === "experience"
                ? [{ created_at: 'desc' }]
                : [
                    // @ts-ignore
                    { ai_percentile: 'desc' },
                    { created_at: 'desc' }
                ]
        });

        let filteredCandidates = candidates.filter((candidate: any) => {
            const skillValues = extractJsonStrings(candidate.skills);
            const experienceValues = extractJsonStrings(candidate.experience);
            const educationValues = extractJsonStrings(candidate.education);
            const interviewKeywordValues = extractJsonStrings(candidate.interviewAttempts?.[0]?.keyword_matches);
            const searchableValues = [
                candidate.name,
                candidate.headline,
                candidate.bio,
                candidate.current_job_title,
                candidate.current_company,
                candidate.total_experience,
                candidate.city,
                candidate.state,
                candidate.country,
                ...skillValues,
                ...experienceValues,
                ...educationValues,
                ...interviewKeywordValues,
            ].filter(Boolean);

            if (!valuesMatchQuery(search, searchableValues)) {
                return false;
            }

            const locationValues = [candidate.city, candidate.state, candidate.country].filter(Boolean);
            if (!valuesMatchQuery(location, locationValues)) {
                return false;
            }

            const roleValues = [
                candidate.headline,
                candidate.current_job_title,
                candidate.current_company,
                candidate.interviewAttempts?.[0]?.role_tested_for,
            ].filter(Boolean);
            if (!valuesMatchQuery(role, roleValues)) {
                return false;
            }

            return true;
        });

        const category = searchParams.get("category");
        if (category && category !== "all") {
            const catLower = category.toLowerCase();
            filteredCandidates = filteredCandidates.filter(c => {
                const cSkills = (Array.isArray(c.skills) ? c.skills : []).map(s => String(s).toLowerCase());
                const cHeadline = (c.headline || "").toLowerCase();
                const cTitle = (c.current_job_title || "").toLowerCase();
                
                // Flexible matching: check if category name is in skills, headline or title
                const matchesCategory = cSkills.some(s => s.includes(catLower)) || 
                                      cHeadline.includes(catLower) || 
                                      cTitle.includes(catLower);
                
                // Specific logic for 'interns'
                if (catLower === "interns") {
                    return (c.total_experience || "").toLowerCase().includes("intern") || 
                           (c.total_experience || "").includes("0") ||
                           matchesCategory;
                }
                
                // Broad categories mappings
                if (catLower === "engineering") {
                    return matchesCategory || cSkills.some(s => ["tech", "software", "developer", "engineer", "node", "react", "python", "backend", "frontend"].some(k => s.includes(k)));
                }

                if (catLower === "design") {
                    return matchesCategory || cSkills.some(s => ["ui", "ux", "design", "graphic", "creative", "figma", "adobe"].some(k => s.includes(k)));
                }

                if (catLower === "management") {
                    return matchesCategory || cSkills.some(s => ["lead", "manager", "pm", "product", "scrum", "agile", "founder"].some(k => s.includes(k)));
                }

                return matchesCategory;
            });
        } else if (skills) {
            const skillArray = skills.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
            if (skillArray.length > 0) {
                filteredCandidates = filteredCandidates.filter(c => {
                    const candidateSkills = extractJsonStrings(c.skills).map((skill) => skill.toLowerCase());
                    return skillArray.some(querySkill =>
                        candidateSkills.some(candidateSkill => candidateSkill.includes(querySkill))
                    );
                });
            }
        }

        if (experience) {
            const requestedExperienceYears = extractYears(experience);
            const normalizedExperience = experience.toLowerCase();

            filteredCandidates = filteredCandidates.filter((c: any) => {
                const candidateExperienceYears = getCandidateExperienceYears(c);
                if (requestedExperienceYears > 0 && candidateExperienceYears >= requestedExperienceYears) {
                    return true;
                }

                if (c.total_experience && c.total_experience.toLowerCase().includes(normalizedExperience)) return true;
                const experienceValues = extractJsonStrings(c.experience).map((value) => value.toLowerCase());
                return experienceValues.some((value) => value.includes(normalizedExperience));
            });
        }

        if (education) {
            filteredCandidates = filteredCandidates.filter(c => {
                const educationValues = extractJsonStrings(c.education).map((value) => value.toLowerCase());
                return educationValues.some((value) => value.includes(education.toLowerCase()));
            });
        }

        if (aiRecommendedOnlyFlag) {
            filteredCandidates = filteredCandidates.filter((c: any) =>
                c.interviewAttempts && Array.isArray(c.interviewAttempts) && c.interviewAttempts.length > 0
            );
        }

        const minScore = searchParams.get("minScore");
        const maxScore = searchParams.get("maxScore");

        if (minScore) {
            const min = parseInt(minScore, 10);
            if (!isNaN(min)) {
                filteredCandidates = filteredCandidates.filter((c: any) => {
                    const topScore = c.interviewAttempts?.[0]?.score;
                    return topScore !== undefined && topScore >= min;
                });
            }
        }
        if (maxScore) {
            const max = parseInt(maxScore, 10);
            if (!isNaN(max)) {
                filteredCandidates = filteredCandidates.filter((c: any) => {
                    const topScore = c.interviewAttempts?.[0]?.score;
                    return topScore !== undefined && topScore <= max;
                });
            }
        }

        const sortedCandidates = [...filteredCandidates].sort((firstCandidate: any, secondCandidate: any) => {
            if (sortBy === "newest") {
                return new Date(secondCandidate.created_at).getTime() - new Date(firstCandidate.created_at).getTime();
            }

            if (sortBy === "experience") {
                const experienceDifference = getCandidateExperienceYears(secondCandidate) - getCandidateExperienceYears(firstCandidate);
                if (experienceDifference !== 0) {
                    return experienceDifference;
                }
            }

            const scoreDifference = getCandidateTopScore(secondCandidate) - getCandidateTopScore(firstCandidate);
            if (scoreDifference !== 0) {
                return scoreDifference;
            }

            return new Date(secondCandidate.created_at).getTime() - new Date(firstCandidate.created_at).getTime();
        });

        const visibleCandidates = (responseLimit ? sortedCandidates.slice(0, responseLimit) : sortedCandidates).map((candidate) => ({
            ...candidate,
            email: canAccessCandidateContact ? candidate.email : null,
            phone: canAccessCandidateContact ? candidate.phone : null,
        }));

        return NextResponse.json({
            candidates: visibleCandidates,
            total: filteredCandidates.length,
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching candidates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
