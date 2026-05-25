import path from "path";
import {
    deleteStoredFileByUrl,
    isLocalStoredUrl,
    readLocalStoredFile,
    readStoredFileByUrl,
    saveStoredFile,
} from "@/lib/file-storage";

const RESUME_UPLOAD_DIR = path.join(process.cwd(), "uploads", "resumes");
const RESUME_URL_PREFIX = "/api/files/resumes/";

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const STORAGE_CONFIG = {
    uploadDir: RESUME_UPLOAD_DIR,
    urlPrefix: RESUME_URL_PREFIX,
    mimeTypeByExtension: MIME_TYPE_BY_EXTENSION,
    extensionByMimeType: EXTENSION_BY_MIME_TYPE,
    defaultExtension: ".bin",
    fallbackMimeType: "application/octet-stream",
};

export function isStoredResumeUrl(url: string | null | undefined) {
    return isLocalStoredUrl(url, RESUME_URL_PREFIX);
}

export async function saveResumeFile(buffer: Buffer, originalName: string, mimeType: string) {
    return saveStoredFile(buffer, originalName, mimeType, "resumes", STORAGE_CONFIG);
}

export async function deleteResumeFileByUrl(url: string | null | undefined) {
    return deleteStoredFileByUrl(url, STORAGE_CONFIG);
}

export async function readStoredResumeFile(fileName: string) {
    return readLocalStoredFile(fileName, STORAGE_CONFIG);
}

export async function readStoredResumeFileByUrl(url: string) {
    return readStoredFileByUrl(url, STORAGE_CONFIG);
}
