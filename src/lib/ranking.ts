import { db } from "./db";

type KeywordMatchData = {
    matched?: unknown;
    total?: unknown;
};

type CandidateMetricSnapshot = {
    ai_rank: number | null;
    ai_percentile: number | null;
    ai_confidence_score: number;
    ai_concept_coverage: number;
};

type CandidateWithAttempts = Awaited<ReturnType<typeof fetchCandidatesForMetrics>>[number];
type Attempt = CandidateWithAttempts["interviewAttempts"][number];

function getEffectiveScore(attempt: Attempt | undefined) {
    if (!attempt) return 0;
    return Number(attempt.ai_final_score ?? attempt.score ?? 0);
}

function getKeywordCoverage(attempt: Attempt | undefined) {
    const keywordMatches = attempt?.keyword_matches as KeywordMatchData | null | undefined;
    const matched = Array.isArray(keywordMatches?.matched) ? keywordMatches.matched.length : 0;
    const total = Number(keywordMatches?.total || 0);

    if (total > 0) {
        return Math.round((matched / total) * 100);
    }

    if (typeof attempt?.ai_concept_score === "number") {
        return Math.round((attempt.ai_concept_score / 5) * 100);
    }

    return Math.round(getEffectiveScore(attempt) * 10);
}

function getAttemptConceptCoverage(attempt: Attempt | undefined) {
    if (!attempt) return 0;

    const keywordMatches = attempt.keyword_matches as KeywordMatchData | null | undefined;
    const matched = Array.isArray(keywordMatches?.matched) ? keywordMatches.matched.length : 0;
    const total = Number(keywordMatches?.total || 0);
    const keywordCoverage = total > 0 ? Math.round((matched / total) * 100) : null;

    const aiConceptCoverage = typeof attempt.ai_concept_score === "number"
        ? Math.round((attempt.ai_concept_score / 5) * 100)
        : null;

    if (keywordCoverage !== null && aiConceptCoverage !== null) {
        return Math.max(0, Math.min(100, Math.round((keywordCoverage * 0.65) + (aiConceptCoverage * 0.35))));
    }

    if (keywordCoverage !== null) return keywordCoverage;
    if (aiConceptCoverage !== null) return aiConceptCoverage;

    return Math.round(getEffectiveScore(attempt) * 10);
}

function getConfidenceScore(attempts: Attempt[], bestAttempt: Attempt | undefined, conceptCoverage: number) {
    if (!bestAttempt) return 0;

    const scorePercent = Math.round(getEffectiveScore(bestAttempt) * 10);
    const attemptSignal = Math.min(15, attempts.length * 5);
    const aiSignals = [
        bestAttempt.ai_final_score,
        bestAttempt.ai_technical_score,
        bestAttempt.ai_concept_score,
        bestAttempt.ai_communication_score,
    ].filter((score) => typeof score === "number").length;
    const aiSignalScore = aiSignals * 5;

    return Math.max(0, Math.min(100, Math.round((scorePercent * 0.65) + (conceptCoverage * 0.2) + attemptSignal + aiSignalScore)));
}

async function fetchCandidatesForMetrics() {
    return db.user.findMany({
        where: {
            role: "candidate",
            is_suspended: false,
        },
        select: {
            id: true,
            interviewAttempts: {
                select: {
                    score: true,
                    ai_final_score: true,
                    ai_technical_score: true,
                    ai_concept_score: true,
                    ai_communication_score: true,
                    keyword_matches: true,
                    created_at: true,
                },
            },
        },
    });
}

export async function getCandidateMetricSnapshots() {
    const candidates = await fetchCandidatesForMetrics();
    const scoredCandidates = candidates
        .map((candidate) => {
            const sortedAttempts = [...candidate.interviewAttempts].sort((a, b) => getEffectiveScore(b) - getEffectiveScore(a));
            const bestAttempt = sortedAttempts[0];
            const latestAttempt = [...candidate.interviewAttempts].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            const conceptCoverage = getAttemptConceptCoverage(latestAttempt);
            const confidenceCoverage = getKeywordCoverage(bestAttempt);

            return {
                id: candidate.id,
                attempts: sortedAttempts,
                bestAttempt,
                score: getEffectiveScore(bestAttempt),
                conceptCoverage,
                confidenceCoverage,
            };
        })
        .filter((candidate) => candidate.bestAttempt);

    scoredCandidates.sort((a, b) => b.score - a.score);

    const total = scoredCandidates.length;
    const snapshots = new Map<string, CandidateMetricSnapshot>();

    scoredCandidates.forEach((candidate, index) => {
        const rank = index + 1;
        const percentile = total > 0
            ? Number((((total - rank + 1) / total) * 100).toFixed(1))
            : null;

        snapshots.set(candidate.id, {
            ai_rank: rank,
            ai_percentile: percentile,
            ai_confidence_score: getConfidenceScore(candidate.attempts, candidate.bestAttempt, candidate.confidenceCoverage),
            ai_concept_coverage: candidate.conceptCoverage,
        });
    });

    return snapshots;
}

export async function getCandidateMetricSnapshot(candidateId: string) {
    const snapshots = await getCandidateMetricSnapshots();
    return snapshots.get(candidateId) || {
        ai_rank: null,
        ai_percentile: null,
        ai_confidence_score: 0,
        ai_concept_coverage: 0,
    };
}

export async function updateGlobalRanks() {
    try {
        const snapshots = await getCandidateMetricSnapshots();

        const candidates = await db.user.findMany({
            where: {
                role: "candidate",
                is_suspended: false,
            },
            select: { id: true },
        });

        for (const candidate of candidates) {
            const snapshot = snapshots.get(candidate.id) || {
                ai_rank: null,
                ai_percentile: null,
                ai_confidence_score: 0,
                ai_concept_coverage: 0,
            };

            await db.user.update({
                where: { id: candidate.id },
                data: {
                    ai_rank: snapshot.ai_rank,
                    ai_percentile: snapshot.ai_percentile,
                    ai_confidence_score: snapshot.ai_confidence_score,
                    ai_concept_coverage: snapshot.ai_concept_coverage,
                    skill_rank: snapshot.ai_rank,
                    skill_percentile: snapshot.ai_percentile,
                },
            });
        }

        console.log(`Updated dashboard metrics for ${candidates.length} candidates.`);
    } catch (error) {
        console.error("Error updating global ranks:", error);
    }
}
