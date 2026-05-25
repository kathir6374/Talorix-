const { google } = require('googleapis');
const { Readable } = require('stream');

async function test() {
    const clientId = "88481205575-70fb9037f1j6p5higf6j2aofjldgfprb.apps.googleusercontent.com";
    const clientSecret = "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";
    const refreshToken = "1//04xA4wkRYhlAeCgYIARAAGAQSNwF-L9IrkCA0luYFOiFqRDX9N1w5N-YFkJwRBjmhgTzP6oXUpL2Vk4vER4JUDy1mguWe8qszg3s";
    const folderId = "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";

    console.log("Setting up auth...");
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const stream = new Readable();
    stream.push(Buffer.from('debug upload content'));
    stream.push(null);

    console.log("Uploading file...");
    try {
        const response = await drive.files.create({
            requestBody: {
                name: 'debug_test.txt',
                parents: [folderId],
            },
            media: {
                mimeType: 'text/plain',
                body: stream,
            },
            fields: 'id, webViewLink',
        });
        console.log("Upload Success! ID:", response.data.id);

        console.log("Setting permissions...");
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        console.log("Permissions set!");
    } catch (err) {
        console.error("DEBUG ERROR:", err.message);
        if (err.response) console.error("RESPONSE DATA:", err.response.data);
    }
}

test();
