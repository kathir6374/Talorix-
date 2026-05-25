const { google } = require("googleapis");
const { Readable } = require("stream");

async function finalTest() {
    try {
        const clientId = "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
        const clientSecret = "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";
        const refreshToken = "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("1. Creating a fresh folder...");
        const folderMetadata = {
            name: "Talorix Final Store",
            mimeType: "application/vnd.google-apps.folder",
        };
        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: "id",
        });
        const folderId = folder.data.id;
        console.log("   New Folder ID:", folderId);

        console.log("2. Uploading a test file into that folder...");
        const stream = new Readable();
        stream.push("This proves the connection is 100% working!");
        stream.push(null);

        const file = await drive.files.create({
            requestBody: {
                name: "test-success.txt",
                parents: [folderId],
            },
            media: {
                mimeType: "text/plain",
                body: stream,
            },
            fields: "id",
        });
        console.log("   Success! File ID:", file.data.id);
        console.log("   FULL SUCCESS. Use this Folder ID in .env:", folderId);

    } catch (err) {
        console.log("FINAL TEST ERROR:", err.message);
    }
}

finalTest();
