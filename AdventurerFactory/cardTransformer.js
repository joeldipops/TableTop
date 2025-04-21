const fs = require("fs");
const readline = require("readline");
const Handlebars = require("handlebars");
const svgConverter = require("convert-svg-to-png");

/**
 * Load a file from the file system into memory.
 */
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

/**
 * Read a file line by line, applying a transformation function to each line.
 */
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

/**
 * Convert a line from the mark-down document (more or less CSV) into
 * json.
 */
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

/**
 * Where a cost with a particular rule associated with it appears in a card effect, 
 * use css styling to show it more prominently.
 */
const SPECIAL_COSTS = ["Encounter", "Consume"];
const highlightSpecialCosts = function(costs) {
    SPECIAL_COSTS.forEach((cost) => {
        // For each special cost, strip out the markdown syntax for bold (**) and replace with html
        const regex = new RegExp(`^(.*?)([*]{0,2}${cost}[*]{0,2})(.*)$`);
        costs = costs.replace(regex, `$1<em class="special-cost">${cost}</em>$3`);
    });

    return costs;
};

const SYMBOL_TOKENS = [
    "Assassin", "Bard", "Knight", "Sorceror",
    "Dwarf", "Ork", "Undead", "Beast", "Tail",
    "Beltpouch", "Mount"
];
const massageEffects = function(data) {
    // Replace markdown italics with html italics
    data = data.replace(/_([A-Za-z]+)_/g, "<i>$1</i>");

    // Replace symbols relating to particular cards or rules into icons built with svg.
    SYMBOL_TOKENS.forEach((token) => {
        data = data.replaceAll(token, `<img class="symbol" height="32" width="32" src="Icons.svg#${token}" alt="${token}" />`);
    });

    const simpleEffectRegex = /^([+-][0-9]+\w?.+[^:]*)|(Provides .+)$/

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

            if (simpleEffectRegex.test(effect.text)) {
                effect.effectClass = "simple-effect";
            }
        }

        return effect;
    });
};

/**
 * Converts the human-editable list of slots a card fills from the markdown
 * into an array useable by the svg template.
 */
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
            xOffset : (-index * 32)
        });
        return result;
    }, []);
}

/**
 * Converts the human-editable list of requirements a card needs from the markdown
 * into an array useable by the svg template.
 */
const massageNeeds = function(data) {
    return data.split(/\s+/).reduce((result, val, index) => {
        val = val.trim();
        if (!val || val === "--") {
            return result;
        }

        result.push({
            key: val,
            xOffset : index * 40
        });

        return result;
    }, []);
}

const CARD_HEIGHT = 900;

const setArt = function(name) {
    const fileName = `art/${santiseForFilename(name)}.png`;
    return fs.existsSync(fileName) ? `../${fileName}` : null
};

const santiseForFilename = function(name) {
    return name.replace(/[^a-z0-9]/gi, '_');
}

/**
 * Converts a card's json representation to one useable by the svg template.
 */
const jsonToTemplateData = function(data, index) {
    return viewModel = {
        x: 4,
        y: (index * CARD_HEIGHT) + 4,
        name: data.Name,
        types: data["Type(s)"],
        cost: data.Cost,
        needs: massageNeeds(data.Needs),
        fills: massageFills(data.Fills),
        effects: massageEffects(data.Text),
        artFile: setArt(data.Name)
    };
};

const generatePrintable = async function(template, viewModel) {
    return await new Promise((resolve, reject) => {
        fs.writeFile("cards/Cards.svg", template(viewModel), (err) => {
            if (err) {
                console.log(err);
                return reject(err);
            }

            return resolve();
        });
    });
};

const generateDigital = async function(template, viewModel) {
    for(let i = 0; i < viewModel.cards.length; i++) {
        const card = viewModel.cards[i];
        card.y = 4;

        const name = santiseForFilename(card.name)
        const fileName = `cards/${name}.svg`;

        console.log("Generating ", name);

        await new Promise((resolve, reject) => {
            fs.writeFile(fileName, template({
                cards : [card],
                totalHeight: 900
            }), (err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                return resolve();
            });
        });

        console.log("Converting ", name, " to png");

        await svgConverter.convertFile(fileName, { outputFilePath : `generated/${name}.png` });

        console.log("Done with ", name);
    }

    return;
};

(async function main() {
    const args = process.argv;

    const data = await transformFile("Cards.md", {
        metaData: {},
        fn: lineToJson
    });

    const viewModel = { cards : [], totalHeight : data.length * CARD_HEIGHT };
    // Filter out lines that aren't actually cards.
    const sortableRegex = /^[0-9]+.*$/;
    data.filter((cardJson) => {
        return cardJson && sortableRegex.test(cardJson["Sort-Index"]);
    })
    .forEach(function(cardJson, index) {
        viewModel.cards.push(jsonToTemplateData(cardJson, index));
    });

    const templateSvg = await loadFile("CardTemplate.svg");
    const template = Handlebars.compile(templateSvg);

    if(args.includes("-p") || args.includes("--printable")) {
        await generatePrintable(template, viewModel);
    }

    if(args.includes("-d") || args.includes("--digital")) {
        await generateDigital(template, viewModel);
    }

    console.log("done");
})();




