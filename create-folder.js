const { google } = require('googleapis');
const fs = require('fs');

async function test() {
    const clientId = "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
    const clientSecret = "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";
    const refreshToken = "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
        name: 'Talorix_Verified_Store',
        mimeType: 'application/vnd.google-apps.folder',
    };

    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        fs.writeFileSync('folder_id.txt', file.data.id);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('folder_id.txt', "ERROR: " + err.message);
        process.exit(1);
    }
}
test();
