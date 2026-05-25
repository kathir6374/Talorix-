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
        // Fix the broken self-closing tag: change " / loading="lazy"" to " loading="lazy""
        // We match an optional space, then a slash, then optional space, then loading="lazy"
        const brokenPattern = /\s*\/\s*loading=["']lazy["']/g;
        
        if (brokenPattern.test(content)) {
            let newContent = content.replace(brokenPattern, ' loading="lazy"');
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Fixed: ${filePath}`);
            fixedFiles++;
        }
    }
});

console.log(`Finished fixing ${fixedFiles} files.`);
