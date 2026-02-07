// scripts/manage_lenders.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../src/data/lenders.json');

const args = process.argv.slice(2);
const command = args[0];

function loadLenders() {
    if (!fs.existsSync(DATA_PATH)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function saveLenders(lenders) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(lenders, null, 2));
    console.log(`Updated lenders.json with ${lenders.length} entries.`);
}

if (command === 'add') {
    // Usage: node manage_lenders.js add "Name" Liquidity BaseAPY [BeliefAPY]
    const name = args[1];
    const liquidity = parseInt(args[2]);
    const baseApy = args[3] || '4.5%';
    const beliefApy = args[4] || '18.0%';

    if (!name || isNaN(liquidity)) {
        console.error('Usage: node manage_lenders.js add "Name" <Liquidity> [BaseAPY] [BeliefAPY]');
        process.exit(1);
    }

    const lenders = loadLenders();
    const newLender = {
        id: `lender-${Date.now()}`,
        name,
        liquidity,
        minCollateral: 120,
        baseApy,
        beliefApy,
        terms: "Standard Terms"
    };

    lenders.push(newLender);
    saveLenders(lenders);
    console.log("Lender added successfully!");

} else if (command === 'list') {
    const lenders = loadLenders();
    console.table(lenders);
} else {
    console.log('Available commands: add, list');
    console.log('Example: node manage_lenders.js add "Whale Fund" 1000000 "4.0%" "16%"');
}
