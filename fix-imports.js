const fs = require('fs');
const files = ['generate-act.ts', 'generate-hooks.ts', 'generate-outline.ts', 'generate-scene-prompts.ts', 'generate-thumb.ts', 'generate-script.ts'];

for (const file of files) {
  const p = 'c:/Users/André/OneDrive/Documentos/DarkMine/app/actions/' + file;
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  const importRegex = /import .* from .*/g;
  const imports = content.match(importRegex);
  
  if (imports) {
    // Remove all imports
    content = content.replace(importRegex, '');
    
    // Insert imports right after 'use server';
    content = content.replace(/'use server';(\r?\n)/, "'use server';\n" + imports.join('\n') + "\n");
    
    // Remove duplicate newlines
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Fixed imports');
