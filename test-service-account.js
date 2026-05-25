const { google } = require("googleapis");
const path = require("path");

async function diagnoseServiceAccount() {
    try {
        console.log("Connecting using Service Account...");

        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, "planar-flux-488316-h0-f54cf61fa5a5.json"),
            scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"],
        });

        const drive = google.drive({ version: "v3", auth });

        console.log("Listing all available files/folders...");
        const response = await drive.files.list({
            pageSize: 10,
            fields: "files(id, name, mimeType)",
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log("No files found. Service account might not have access to any folders yet.");
        } else {
            console.log("Found Files/Folders:");
            files.forEach(f => {
                console.log(`- NAME: "${f.name}" | ID: "${f.id}" | TYPE: ${f.mimeType}`);
            });
        }

    } catch (err) {
        console.log("DIAGNOSTIC ERROR:", err.message);
    }
}

diagnoseServiceAccount();
