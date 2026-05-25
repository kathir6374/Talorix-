import crypto from "crypto";
import path from "path";
import { del, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";

type StorageConfig = {
    uploadDir: string;
    urlPrefix: string;
    mimeTypeByExtension: Record<string, string>;
    extensionByMimeType: Record<string, string>;
    defaultExtension: string;
    fallbackMimeType?: string;
};

function sanitizeFileNameBase(name: string) {
    const parsed = path.parse(name);
    const safeBase = parsed.name
        .replace(/[^a-z0-9_-]/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return safeBase || "file";
}

function getFileExtension(fileName: string, mimeType: string, config: StorageConfig) {
    const parsedExtension = path.extname(fileName).toLowerCase();
    if (config.mimeTypeByExtension[parsedExtension] === mimeType) {
        return parsedExtension;
    }

    return config.extensionByMimeType[mimeType] || parsedExtension || config.defaultExtension;
}

function getMimeType(fileName: string, config: StorageConfig) {
    return config.mimeTypeByExtension[path.extname(fileName).toLowerCase()] || config.fallbackMimeType || "application/octet-stream";
}

function resolveStoredFilePath(fileName: string, uploadDir: string) {
    const safeFileName = path.basename(fileName);
    const filePath = path.resolve(uploadDir, safeFileName);
    const uploadRoot = path.resolve(uploadDir);

    if (!filePath.startsWith(uploadRoot + path.sep)) {
        throw new Error("Invalid stored file path.");
    }

    return filePath;
}

function getStoredFileNameFromUrl(url: string, urlPrefix: string) {
    const pathname = url.startsWith("http")
        ? new URL(url).pathname
        : url;

    if (!pathname.startsWith(urlPrefix)) {
        return null;
    }

    return decodeURIComponent(pathname.slice(urlPrefix.length));
}

function isBlobStorageConfigured() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function ensureBlobStorageConfiguredForVercel() {
    if (process.env.VERCEL && !isBlobStorageConfigured()) {
        throw new Error("BLOB_READ_WRITE_TOKEN is required on Vercel for persistent file uploads.");
    }
}

function getRemoteFileName(url: string) {
    try {
        return decodeURIComponent(path.basename(new URL(url).pathname)) || "file";
    } catch {
        return "file";
    }
}

function getFileNameFromContentDisposition(contentDisposition: string | null, fallbackFileName: string) {
    if (!contentDisposition) {
        return fallbackFileName;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (asciiMatch?.[1]) {
        return asciiMatch[1];
    }

    return fallbackFileName;
}

export function isLocalStoredUrl(url: string | null | undefined, urlPrefix: string) {
    if (!url) {
        return false;
    }

    const pathname = url.startsWith("http")
        ? new URL(url).pathname
        : url;

    return pathname.startsWith(urlPrefix);
}

export async function saveStoredFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folderName: string,
    config: StorageConfig
) {
    const storedFileName = `${Date.now()}_${crypto.randomUUID()}_${sanitizeFileNameBase(originalName)}${getFileExtension(
        originalName,
        mimeType,
        config
    )}`;

    if (isBlobStorageConfigured()) {
        const blob = await put(`${folderName}/${storedFileName}`, buffer, {
            access: "public",
            addRandomSuffix: false,
            contentType: mimeType,
        });

        return {
            fileName: storedFileName,
            url: blob.url,
        };
    }

    ensureBlobStorageConfiguredForVercel();

    await mkdir(config.uploadDir, { recursive: true });
    const filePath = resolveStoredFilePath(storedFileName, config.uploadDir);
    await writeFile(filePath, buffer);

    return {
        fileName: storedFileName,
        url: `${config.urlPrefix}${encodeURIComponent(storedFileName)}`,
    };
}

export async function deleteStoredFileByUrl(url: string | null | undefined, config: StorageConfig) {
    if (!url) {
        return false;
    }

    const storedFileName = getStoredFileNameFromUrl(url, config.urlPrefix);
    if (storedFileName) {
        try {
            await unlink(resolveStoredFilePath(storedFileName, config.uploadDir));
            return true;
        } catch (error: unknown) {
            if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
                return false;
            }

            throw error;
        }
    }

    if (isBlobStorageConfigured()) {
        try {
            await del(url);
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message.toLowerCase() : "";
            if (message.includes("not found") || message.includes("404")) {
                return false;
            }

            throw error;
        }
    }

    return false;
}

export async function readLocalStoredFile(fileName: string, config: StorageConfig) {
    const safeFileName = decodeURIComponent(fileName);
    const filePath = resolveStoredFilePath(safeFileName, config.uploadDir);

    return {
        fileName: safeFileName,
        mimeType: getMimeType(safeFileName, config),
        buffer: await readFile(filePath),
    };
}

export async function readStoredFileByUrl(url: string, config: StorageConfig) {
    const storedFileName = getStoredFileNameFromUrl(url, config.urlPrefix);
    if (storedFileName) {
        return readLocalStoredFile(storedFileName, config);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch stored file: ${response.status} ${response.statusText}`);
    }

    const fallbackFileName = getRemoteFileName(url);
    const fileName = getFileNameFromContentDisposition(
        response.headers.get("content-disposition"),
        fallbackFileName
    );
    const mimeType = response.headers.get("content-type") || getMimeType(fileName, config);

    return {
        fileName,
        mimeType,
        buffer: Buffer.from(await response.arrayBuffer()),
    };
}
