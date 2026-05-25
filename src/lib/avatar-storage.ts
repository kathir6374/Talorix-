import path from "path";
import {
    deleteStoredFileByUrl,
    readLocalStoredFile,
    saveStoredFile,
} from "@/lib/file-storage";

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");
const AVATAR_URL_PREFIX = "/api/files/avatars/";

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
};

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
};

const STORAGE_CONFIG = {
    uploadDir: AVATAR_UPLOAD_DIR,
    urlPrefix: AVATAR_URL_PREFIX,
    mimeTypeByExtension: MIME_TYPE_BY_EXTENSION,
    extensionByMimeType: EXTENSION_BY_MIME_TYPE,
    defaultExtension: ".jpg",
    fallbackMimeType: "application/octet-stream",
};

export async function saveAvatarFile(buffer: Buffer, originalName: string, mimeType: string) {
    return saveStoredFile(buffer, originalName, mimeType, "avatars", STORAGE_CONFIG);
}

export async function deleteAvatarFileByUrl(url: string | null | undefined) {
    return deleteStoredFileByUrl(url, STORAGE_CONFIG);
}

export async function readStoredAvatarFile(fileName: string) {
    return readLocalStoredFile(fileName, STORAGE_CONFIG);
}
