const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // We only want to remove truncate and whitespace-nowrap if they appear inside className strings
    // But since it's tailwind, they might be in template literals or normal strings.
    // Let's just blindly replace them if they are surrounded by spaces/quotes.
    // Better: replace ` truncate ` with ` `
    // replace ` whitespace-nowrap ` with ` `
    // Also handle boundaries.
    
    content = content.replace(/\btruncate\b/g, '');
    content = content.replace(/\bwhitespace-nowrap\b/g, '');
    
    // Also replace `truncate-on-mobile` just in case, but let's be careful.
    content = content.replace(/\btruncate-on-mobile\b/g, '');

    // Cleanup extra spaces in className="..."
    content = content.replace(/className="([^"]*)"/g, (match, p1) => {
      return `className="${p1.replace(/\s+/g, ' ').trim()}"`;
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
