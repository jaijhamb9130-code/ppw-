const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/AdminProfile.tsx', 'utf8');

let openDivs = 0;
let closeDivs = 0;
let openParens = 0;
let closeParens = 0;
let openBraces = 0;
let closeBraces = 0;

const lines = content.split('\n');
lines.forEach((line, i) => {
    const dOpen = (line.match(/<div/g) || []).length;
    const dClose = (line.match(/<\/div>/g) || []).length;
    const pOpen = (line.match(/\(/g) || []).length;
    const pClose = (line.match(/\)/g) || []).length;
    const bOpen = (line.match(/\{/g) || []).length;
    const bClose = (line.match(/\}/g) || []).length;

    openDivs += dOpen;
    closeDivs += dClose;
    openParens += pOpen;
    closeParens += pClose;
    openBraces += bOpen;
    closeBraces += bClose;

    if (dOpen || dClose) {
        console.log(`Line ${i+1}: Divs Open=${openDivs}, Close=${closeDivs}, Diff=${openDivs - closeDivs}`);
    }
});

console.log('Final counts:');
console.log(`Divs: ${openDivs} / ${closeDivs}`);
console.log(`Parens: ${openParens} / ${closeParens}`);
console.log(`Braces: ${openBraces} / ${closeBraces}`);
