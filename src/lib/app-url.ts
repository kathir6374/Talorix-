function normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, "");
}

export function getAppBaseUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredUrl) {
        return normalizeBaseUrl(configuredUrl);
    }

    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) {
        return normalizeBaseUrl(`https://${vercelUrl.replace(/^https?:\/\//, "")}`);
    }

    return "https://talorix.com";
}
