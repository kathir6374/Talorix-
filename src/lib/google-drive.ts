import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID || "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "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";
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error(
            "Missing Google OAuth2 credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env"
        );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
}

export async function uploadFileToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });

    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: "id, webViewLink",
    });

    const fileId = response.data.id!;

    // Make the file viewable by anyone with the link
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: "reader",
            type: "anyone",
        },
    });

    // Re-fetch to get the webViewLink (sometimes create doesn't return it reliably)
    const file = await drive.files.get({
        fileId,
        fields: "webViewLink",
    });

    const isImage = mimeType.startsWith("image/");

    return {
        fileId,
        webViewLink: file.data.webViewLink!,
        // Use lh3.googleusercontent.com for images as it's much more reliable for embedding in <img> tags
        // and doesn't get blocked by "third-party cookie" settings.
        directLink: isImage
            ? `https://lh3.googleusercontent.com/d/${fileId}=s1000`
            : `https://drive.google.com/uc?id=${fileId}&export=download`,
    };
}

export async function uploadResumeToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
    return uploadFileToDrive(fileBuffer, fileName, mimeType, folderId);
}

export async function uploadAvatarToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
    return uploadFileToDrive(fileBuffer, fileName, mimeType, folderId);
}

export async function uploadLogoToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
    return uploadFileToDrive(fileBuffer, fileName, mimeType, folderId);
}

export async function uploadMediaToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
    return uploadFileToDrive(fileBuffer, fileName, mimeType, folderId);
}
