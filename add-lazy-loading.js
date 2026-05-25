const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let changedFiles = 0;
walkDir('./src', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(/<img(?![^>]*\bloading=["']lazy["'])([^>]+)>/g, '<img$1 loading="lazy" decoding="async">');
        
        // Let's also fix cases where decoding="async" might be duplicated
        newContent = newContent.replace(/decoding=["']async["']\s*decoding=["']async["']/g, 'decoding="async"');
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated', filePath);
            changedFiles++;
        }
    }
});

console.log(`Updated ${changedFiles} files with loading="lazy".`);
