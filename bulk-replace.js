const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(fullPath));
        } else { 
            if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) results.push(fullPath);
        }
    });
    return results;
}

const files = walk('d:/DONE/ERP/erp-core/src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Replace both @/types and ../types, ignoring any subpath imports like @/types/something just in case, though there shouldn't be
    let newContent = content.replace(/from\s+['"]@\/types['"]/g, "from 'erp-shared'")
                           .replace(/from\s+['"]\.\.\/types['"]/g, "from 'erp-shared'")
                           .replace(/from\s+['"]\.\.\/\.\.\/types['"]/g, "from 'erp-shared'");
    if (content !== newContent) {
        fs.writeFileSync(f, newContent);
        console.log('Updated:', f);
    }
});
