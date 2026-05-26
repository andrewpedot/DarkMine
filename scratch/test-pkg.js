const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../node_modules/pdf-parse/package.json'), 'utf8'));
console.log('Name:', pkg.name);
console.log('Version:', pkg.version);
console.log('Description:', pkg.description);
console.log('Main:', pkg.main);
console.log('Module:', pkg.module);
console.log('Exports:', pkg.exports);
