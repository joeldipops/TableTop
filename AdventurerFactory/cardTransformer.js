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

const messageEffects = function(data) {
    return data.split("<br />").map((effectText) => {;
        const effect = {};
        const parts = effectText.split(":").map((part) => part.trim());

        if (parts[1]) {
            effect.isAction = true;
            effect.cost = parts[0];

            // Need to be more granular than this,
            // but enough for tonight.
            if (
                effect.cost === "**Encounter**"
                || effect.cost === "**Consume**"
            ) {
                effect.costClass = "special-cost";
            }

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
    return data.split("/").reduce((result, val) => {
        val = val.trim();
        if (!val || val === "--") {
            return result;
        }
        result.push(val);
        return result;
    }, []);
}

const jsonToSvg = function(template, data) {
    const viewModel = {
        name: data.Name,
        types: data["Type(s)"],
        cost: data.Cost,
        needs: data.Needs,
        fills: massageFills(data.Fills),
        effects: messageEffects(data.Text)
    };

    console.log(template(viewModel));
};

(async function main() {
    const data = await transformFile("Cards.md", {
        metaData: {},
        fn: lineToJson
    });
    console.log(data);

    const templateSvg = await loadFile("CardTemplate.svg");
    const template = Handlebars.compile(templateSvg);

    data.forEach(function(cardJson) {
        if (!cardJson) {
            return;
        }
        jsonToSvg(template, cardJson);
    });
})();




