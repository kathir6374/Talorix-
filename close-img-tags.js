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
        
        // Find tags that don't have a closing slash but have attributes
        // Specifically, looking for <img ... loading="lazy" decoding="async"> without the />
        // The pattern matches <img followed by anything up to the next > that doesn't end in />
        let newContent = content.replace(/<img((?:[^>](?!\/>))*[^>])>/g, '<img$1 />');
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Self-closed: ${filePath}`);
            fixedFiles++;
        }
    }
});

console.log(`Finished fixing ${fixedFiles} files.`);
