const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const targetDir = './src';
let fixedFiles = 0;

walkDir(targetDir, (filePath) => {
    if (filePath.match(/\.(tsx|jsx|ts|js)$/)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Find <img> tags and remove duplicate decoding or loading attributes
        let newContent = content.replace(/<img([^>]+)>/g, (match, attrs) => {
            // Split attributes by space, but be careful with quotes
            // This is a simplified version, but should work for our specific case
            // Let's just manually fix the known duplicates we introduced
            let fixedAttrs = attrs;
            
            // If there's a duplicate decoding="async" with something in between
            if ((fixedAttrs.match(/decoding=["']async["']/g) || []).length > 1) {
                fixedAttrs = fixedAttrs.replace(/decoding=["']async["']\s+loading=["']lazy["']\s+decoding=["']async["']/g, 'decoding="async" loading="lazy"');
                fixedAttrs = fixedAttrs.replace(/loading=["']lazy["']\s+decoding=["']async["']\s+loading=["']lazy["']/g, 'loading="lazy" decoding="async"');
            }
            
            return `<img${fixedAttrs}>`;
        });
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Cleaned up attributes: ${filePath}`);
            fixedFiles++;
        }
    }
});

console.log(`Finished cleaning up ${fixedFiles} files.`);
