const { google } = require("googleapis");
const path = require("path");

async function testFolderAccess() {
    try {
        const folderId = "19JiOaReaLdhxA0gt_t9YSV5NDBH03AGW";
        console.log(`Checking access to folder: ${folderId}`);

        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, "planar-flux-488316-h0-f54cf61fa5a5.json"),
            scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.metadata.readonly"],
        });

        const drive = google.drive({ version: "v3", auth });

        try {
            const res = await drive.files.get({
                fileId: folderId,
                fields: "id, name, permissions",
            });
            console.log(`Successfully accessed folder! NAME: "${res.data.name}"`);
        } catch (err) {
            console.log(`COULD NOT ACCESS FOLDER: ${err.message}`);
            console.log(`HINT: Share the folder with the Service Account email: deploynix-drive@planar-flux-488316-h0.iam.gserviceaccount.com`);
        }

    } catch (err) {
        console.log("TEST ERROR:", err.message);
    }
}

testFolderAccess();
