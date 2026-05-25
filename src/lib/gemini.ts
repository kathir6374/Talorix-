const GEMINI_LIMIT_ERROR_PATTERN = /(quota|rate limit|too many requests|resource exhausted|exceed|limit reached|limit exceeded)/i;
const GEMINI_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{20,}$/;

function normalizeGeminiKey(value: string) {
    return value.trim().replace(/^[\s"'`[\](){}]+|[\s"'`,\](){}]+$/g, "");
}

function extractGeminiKeyCandidates(rawValue: string | undefined): string[] {
    if (!rawValue) {
        return [];
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return [];
    }

    if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
        try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                return parsed.flatMap((value) => extractGeminiKeyCandidates(String(value)));
            }

            if (typeof parsed === "string") {
                return extractGeminiKeyCandidates(parsed);
            }
        } catch {
            // Fall through to delimiter-based parsing below.
        }
    }

    return trimmed
        .split(/[\r\n,;]+/)
        .map(normalizeGeminiKey)
        .filter(Boolean);
}

export function getGeminiApiKeys() {
    const envKeys = [
        ...extractGeminiKeyCandidates(process.env.GEMINI_API_KEYS),
        ...extractGeminiKeyCandidates(process.env.GEMINI_API_KEY),
    ];

    return [...new Set(envKeys.filter((key) => GEMINI_KEY_PATTERN.test(key)))];
}

function shouldRotateGeminiKey(status: number, errorText: string) {
    if (status === 429 || status === 503) {
        return true;
    }

    if ((status === 400 || status === 403) && GEMINI_LIMIT_ERROR_PATTERN.test(errorText)) {
        return true;
    }

    return false;
}

export async function generateGeminiContentWithRotation({
    model,
    body,
    timeoutMs = 30000,
    requestLabel = "Gemini request",
}: {
    model: string;
    body: Record<string, unknown>;
    timeoutMs?: number;
    requestLabel?: string;
}) {
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
        console.warn(`[Gemini] No API keys configured for ${requestLabel}.`);
        return null;
    }

    let lastFailure: { status: number; errorText: string; keyIndex: number } | null = null;

    for (let index = 0; index < apiKeys.length; index += 1) {
        const apiKey = apiKeys[index];

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(timeoutMs),
                }
            );

            if (response.ok) {
                if (index > 0) {
                    console.info(`[Gemini] ${requestLabel} succeeded with fallback key ${index + 1}/${apiKeys.length}.`);
                }

                return {
                    payload: await response.json(),
                    keyIndex: index,
                };
            }

            const errorText = await response.text();
            const canRotate = shouldRotateGeminiKey(response.status, errorText);
            lastFailure = { status: response.status, errorText, keyIndex: index };

            if (canRotate && index < apiKeys.length - 1) {
                console.warn(`[Gemini] ${requestLabel} hit limits on key ${index + 1}/${apiKeys.length}. Retrying with the next configured key.`);
                continue;
            }

            console.error(`[Gemini] ${requestLabel} failed on key ${index + 1}/${apiKeys.length}.`, {
                status: response.status,
                body: errorText,
            });

            if (!canRotate) {
                return null;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lastFailure = { status: 0, errorText: message, keyIndex: index };

            console.error(`[Gemini] ${requestLabel} threw on key ${index + 1}/${apiKeys.length}.`, error);
        }
    }

    if (lastFailure) {
        console.error(`[Gemini] All configured API keys failed for ${requestLabel}.`, lastFailure);
    }

    return null;
}
