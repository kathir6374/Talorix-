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
        
        // Match onError={(e) = /> (e.currentTarget.style.display = 'none')}
        // Specifically look for that exact broken pattern
        const brokenPattern = /onError=\{\(e\)\s*=\s*\/>/g;
        
        if (brokenPattern.test(content)) {
            let newContent = content.replace(brokenPattern, 'onError={(e) =>');
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Fixed Error Handler: ${filePath}`);
            fixedFiles++;
        }
    }
});

console.log(`Finished fixing ${fixedFiles} files.`);
