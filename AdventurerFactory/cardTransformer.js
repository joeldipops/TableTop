const fs = require("fs");
const readline = require("readline");
const Handlebars = require("handlebars");

const loadFile = function(filePath) {
    return new Promise((resolve, reject) => {
        fs.open(filePath, "r", function(err, fileToRead) {
            if (err) {
               reject(err);
               return;
            }

            fs.readFile(fileToRead, {encoding: "utf-8"}, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(data);
            });
        });
    });
};

const transformFile = function(filePath, transformer) {
    const result = new Promise((resolve, reject) => {
        const interface = readline.createInterface({
            input: fs.createReadStream(filePath),
            console: false
        });
        const data = [];

        interface.on("line", (line) => {
            data.push(transformer.fn(line, transformer.metaData));
        });

        interface.on("close", () => {
            resolve(data);
        });
    });
    
    return result;
};

const lineToJson = function(line, metaData) {
    if (!metaData.lineNumber) {
        metaData.lineNumber = 1;
        metaData.keys = line.split("|").map((key) => key.trim());

        return null;
    }

    const result = {};
    const values = line.split("|").map((key) => key.trim());

    for(let i = 0; i < metaData.keys.length; i++) {
        const key = metaData.keys[i];
        if (key) {
            result[key] = values[i];
        }
    }

    metaData.lineNumber++;

    return result;
};

const highlightSpecialCosts = function(costs) {
    const specials = ["Encounter", "Consume"];
    specials.forEach((cost) => {
        // For each special cost, strip out the markdown syntax for bold (**) and replace with html
        const regex = new RegExp(`^(.*?)([*]{0,2}${cost}[*]{0,2})(.*)$`);
        costs = costs.replace(regex, `$1<em class="special-cost">${cost}</em>$3`);
    });

    return costs;
};

const _symbolTokens = [
    "Assassin", "Bard", "Knight", "Sorceror",
    "Dwarf", "Ork", "Undead", "Beast", "Tail"
];

const messageEffects = function(data) {
    // Replace markdown italics with html italics
    data = data.replace(/_([A-Za-z]+)_/g, "<i>$1</i>");

    _symbolTokens.forEach((token) => {
        data = data.replaceAll(token, `<img class="symbol" height="16" width="16" src="Icons.svg#${token}" alt="${token}" />`);
    });

    return data.split("<br />").map((effectText) => {;
        const effect = {};

        // Format actions differently to passive effects.
        const parts = effectText.split(/:/).map((part) => part.trim());

        if (parts[1]) {
            effect.isAction = true;
            effect.cost = parts[0];

            effect.cost = highlightSpecialCosts(effect.cost);

            effect.text = parts[1];
        } else {
            effect.text = parts[0] || "";

            // Shit check, do this properly
            if (effect.text.length <= 5) {
                effect.effectClass = "simple-effect";
            }
        }

        return effect;
    });
};

const massageFills = function(data) {
    return data.split(/\s+/).reduce((result, val, index) => {
        val = val.trim();
        if (!val || val === "--") {
            return result;
        }

        if (val === "/") {
            val = "slash";
        }

        if (val === "&") {
            val = "and";
        }

        result.push({
            key : val,
            xOffset : -index * 16
        });
        return result;
    }, []);
}

const massageNeeds = function(data) {
    return data.split(/\s+/).reduce((result, val, index) => {
        val = val.trim();
        if (!val || val === "--") {
            return result;
        }

        result.push({
            key: val,
            xOffset : index * 20
        });

        return result;
    }, []);
}

const CARD_HEIGHT = 450;

const jsonToSvg = function(data, index) {
    return viewModel = {
        x: 4,
        y: (index * CARD_HEIGHT),
        name: data.Name,
        types: data["Type(s)"],
        cost: data.Cost,
        needs: massageNeeds(data.Needs),
        fills: massageFills(data.Fills),
        effects: messageEffects(data.Text)
    };
};

(async function main() {
    const data = await transformFile("Cards.md", {
        metaData: {},
        fn: lineToJson
    });

    const templateSvg = await loadFile("CardTemplate.svg");
    const template = Handlebars.compile(templateSvg);

    const viewModel = { cards : [], totalHeight : data.length * CARD_HEIGHT };
    data.forEach(function(cardJson, index) {
        if (!cardJson) {
            return;
        }
        viewModel.cards.push(jsonToSvg(cardJson, index));
    });

    await new Promise((resolve, reject) => {
            fs.writeFile("Cards.svg", template(viewModel), (err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                return resolve();
            });
    });

    console.log("done");
})();




