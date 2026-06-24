const fs = require('fs');
const path = require('path');

const projectDir = 'C:\\Users\\jenpr\\.gemini\\antigravity\\scratch\\rspg-botanical-garden\\src';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const keywords = ['mock', 'จำลอง', 'dummy', 'samplePlants', 'temp', 'seed', 'demo'];

walkDir(projectDir, (filePath) => {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      console.log(`Found "${keyword}" in ${path.relative(projectDir, filePath)}`);
      // Find line number and print snippet
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`  Line ${idx + 1}: ${line.trim().substring(0, 100)}`);
        }
      });
    }
  });
});
