const { google } = require("googleapis");

async function diagnoseDrive() {
    try {
        const clientId = "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
        const clientSecret = "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";
        const refreshToken = "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";

        console.log("Connecting to Google Drive...");

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("Listing all available folders...");
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: "files(id, name)",
            pageSize: 10
        });

        const folders = response.data.files;
        if (folders.length === 0) {
            console.log("No folders found in this account! Please make sure talorix.jobs@gmail.com has created a folder or has been shared one as Editor.");
        } else {
            console.log("Found Folders:");
            folders.forEach(f => {
                console.log(`- NAME: "${f.name}" | ID: "${f.id}"`);
            });
        }

    } catch (err) {
        console.log("DIAGNOSTIC ERROR:", err.message);
    }
}

diagnoseDrive();
