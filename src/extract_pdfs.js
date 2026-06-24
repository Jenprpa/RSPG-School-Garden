import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const assetsDir = path.resolve('./src/assets');
const outputFilePath = path.resolve('./pdf_text.txt');

const files = [
  { file: '06_nature_life.pdf', label: '=== 06 ใบงานธรรมชาติแห่งชีวิต ===' },
  { file: '07_interconnected.pdf', label: '=== 07 ใบงานสรรพสิ่งล้วนพันเกี่ยว ===' },
  { file: '08_benefit_humanity.pdf', label: '=== 08 ใบงานประโยชน์แท้แก่มหาชน ===' }
];

async function extract() {
  let output = '';
  for (const item of files) {
    const filePath = path.join(assetsDir, item.file);
    console.log(`Extracting ${filePath}...`);
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      output += `${item.label}\n\n${textResult.text}\n\n\n`;
      await parser.destroy();
      console.log(`Success ${item.file}`);
    } catch (err) {
      console.error(`Error extracting ${item.file}:`, err.message);
      output += `${item.label}\n\n[ERROR: ${err.message}]\n\n\n`;
    }
  }
  
  fs.writeFileSync(outputFilePath, output, 'utf-8');
  console.log(`Saved output to ${outputFilePath}`);
}

extract();
