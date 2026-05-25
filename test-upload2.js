const { google } = require("googleapis");

async function testUpload() {
    try {
        const clientId = "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
        const clientSecret = "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";
        const refreshToken = "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";
        const folderId = "198CxfdrImJ-c5thosnH4RSanlStxRX2C";

        console.log("Credentials loaded!");

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Explicit test call
        console.log("Fetching folder info...");
        const check = await drive.files.get({ fileId: folderId, fields: "id, name" });
        console.log("Folder access confirmed! Name:", check.data.name);

    } catch (err) {
        console.log("CAUGHT ERROR:", err.message);
    }
}

testUpload();
