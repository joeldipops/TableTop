const fs = require('fs');
const csv = require('csv');

function loadFromCsv() {
    const result = new Promise(function(resolve, reject) {
        fs.readFile("./cards.csv", function (err, fileData) {
            csv.parse(fileData, {columns: false, trim: true}, function(err, rows) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows);
            });
        });
    });

    return result;
};

/**
 * Convert a line from the mark-down document (more or less CSV) into
 * json.
 */
const lineToJson = function(line) {
    const result = {
        name: line[0],
		hunger_cost: parseInt(line[2], 10),
		time_cost: parseInt(line[3], 10),
        effect_modifier : parseFloat(line[6], 10)
    };

    const requirements = line[4];
    result.requirements = requirements ? requirements.split("|").map((r) => r.trim()) : [];
    return result;
};

async function getAsPojo() {
    const lines = await loadFromCsv();

    const result = [];

    for(let i = 2; i < lines.length; i++) {
        cardName = lines[i][0];
        if (cardName === "DISHES" || cardName === "") {
            continue;
        }
        if (lines[i][0] === "TOOLS") {
            break;
        }

        result.push(lineToJson(lines[i]));
    }

    return result;
}

const conversionFactor = 1;
function calculateBalanceFactors(data) {
    data.forEach(function(card) {
	    const ins = card.hunger_cost;
        const outs = (card.time_cost + (card.requirements.length * 2) + card.effect_modifier) * conversionFactor;
			
		card.balance_factor = ins - outs;
    });

    return data;
}

(async function() {
    const data = await getAsPojo();
    console.log(calculateBalanceFactors(data));
})();