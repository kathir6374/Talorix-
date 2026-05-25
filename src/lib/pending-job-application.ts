const PENDING_JOB_APPLICATION_STORAGE_KEY = "talorix_pending_job_application";
const PENDING_JOB_APPLICATION_MAX_AGE_MS = 60 * 60 * 1000;

interface PendingJobApplicationPayload {
    jobId: string;
    createdAt: number;
}

export function savePendingJobApplication(jobId: string) {
    if (typeof window === "undefined") return;

    const trimmedJobId = jobId.trim();
    if (!trimmedJobId) return;

    const payload: PendingJobApplicationPayload = {
        jobId: trimmedJobId,
        createdAt: Date.now(),
    };

    try {
        window.sessionStorage.setItem(
            PENDING_JOB_APPLICATION_STORAGE_KEY,
            JSON.stringify(payload)
        );
    } catch (error) {
        console.error("Failed to store pending job application:", error);
    }
}

export function getPendingJobApplication() {
    if (typeof window === "undefined") return null;

    try {
        const rawValue = window.sessionStorage.getItem(PENDING_JOB_APPLICATION_STORAGE_KEY);
        if (!rawValue) return null;

        const parsedValue = JSON.parse(rawValue) as Partial<PendingJobApplicationPayload>;
        if (
            !parsedValue ||
            typeof parsedValue.jobId !== "string" ||
            !parsedValue.jobId.trim() ||
            typeof parsedValue.createdAt !== "number"
        ) {
            clearPendingJobApplication();
            return null;
        }

        if (Date.now() - parsedValue.createdAt > PENDING_JOB_APPLICATION_MAX_AGE_MS) {
            clearPendingJobApplication();
            return null;
        }

        return {
            jobId: parsedValue.jobId.trim(),
            createdAt: parsedValue.createdAt,
        };
    } catch (error) {
        console.error("Failed to read pending job application:", error);
        clearPendingJobApplication();
        return null;
    }
}

export function clearPendingJobApplication() {
    if (typeof window === "undefined") return;

    try {
        window.sessionStorage.removeItem(PENDING_JOB_APPLICATION_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear pending job application:", error);
    }
}

export function getPendingJobApplicationHref(jobId: string) {
    return `/jobs/${encodeURIComponent(jobId)}?apply=1`;
}
