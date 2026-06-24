const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jenpr\\.gemini\\antigravity\\brain\\5fb60726-3703-482b-ad49-f2c884520ac0\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    let matchCount = 0;
    lines.forEach((line, index) => {
        if (line.includes('make_transparent')) {
            console.log(`Line ${index + 1}:`);
            console.log(line.substring(0, 1000) + '...');
            matchCount++;
        }
    });
    console.log(`Total matches: ${matchCount}`);
} else {
    console.log('Log file not found at:', logPath);
}
