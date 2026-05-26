const { PDFParse } = require('pdf-parse');
console.log('PDFParse constructor:', PDFParse.toString());
const parser = new PDFParse();
console.log('parser keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
console.log('parser prototype keys:', Object.keys(parser));
