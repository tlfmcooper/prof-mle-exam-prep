const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('data/missing-questions.json', 'utf8'));
    console.log(`Total questions: ${data.length}`);
} catch (e) {
    console.error(e);
}
