// Main logic of the application.
(async function() {
    let currentFilters = {};
    let _headers;

    const fnFind = function(cardId, card) {
        return card.identity === cardId;
    };

    const onRemoveClick = function(event) {
        const cardId = event.currentTarget.getAttribute("data-cardid")
        const card = _fullList.find(fnFind.bind(null, cardId));

        const updateList = card.quantity >=  window.DeckEditor.COPY_LIMIT;

        card.quantity--;
        renderDeck(_fullList, _deckCardTemplate);
        bindEvents(events);

        // enable the button since we're under the limit.
        if (updateList) {
            const li = document.getElementById(`listCard_${card.identity}`);
            renderListItem(card, li, _cardTemplate, "", "beforebegin");
            li.parentElement.removeChild(li);
        }
    }

    const onAddClick = function(event) {
        const cardId = event.currentTarget.getAttribute("data-cardid")

        const card = _fullList.find(fnFind.bind(null, cardId));
        card.quantity = card.quantity || 0;

        if (card.quantity < window.DeckEditor.COPY_LIMIT) {
            card.quantity++;
            renderDeck(_fullList, _deckCardTemplate);
            bindEvents(events);
        }

        // Disable the button since we're over the limit.
        if (card.quantity >= window.DeckEditor.COPY_LIMIT) {
            const li = document.getElementById(`listCard_${card.identity}`);
            renderListItem(card, li, _cardTemplate, "disabled", "beforebegin");
            li.parentElement.removeChild(li);
        }
    };

    const onFilterChange = function(event) {
        currentFilters = {};
        document.querySelectorAll("#filters select")
        .forEach(function(el) {
            const name = el.getAttribute("name");
            if (el.value !== "Any") {
                currentFilters[name] = el.value;
            }
        });

        let displayList = filterList(_fullList);
        displayList = sortList(displayList);

        renderList(displayList, _cardTemplate);
        bindEvents(events);
    }

    const nameRegex = /(.+)\..*/;
    const parseCsv = function(lines, isTemplate) {
        // First line are headers, which are required for foreign consumer to be able to understand our csv.
        _headers = lines.shift();

        return lines.map(line => {
            const cardArr = line.split(",");

            const regexResult = nameRegex.exec(cardArr[1])
            if (!regexResult) {
                return;
            }

            const card = _fullList.find(fnFind.bind({}, regexResult[1]));
            if (!card) {
                return;
            }

            card.foreignLink = cardArr[0];
            card.quantity = parseInt(cardArr[2], 10);
            card.foreignToken = cardArr[3];

            return card;
        });
    };

    const buildCsv = function(list) {
        let result = `data:text/csv;charset=utf-8,${_headers}\r`;
        list.forEach(function(card) {
            if (!card.quantity) {
                return;
            }

            result += `${card.foreignLink},${card.identity}.png,${card.quantity},${card.foreignToken}\r`;
        });

        return result;
    }

    const onCsvLoad = function (event) {
        const lines = event.target.result.split(/[\r\n]+/);

        const cards = parseCsv(lines);

        let displayList = filterList(_fullList);
        displayList = sortList(displayList);

        renderList(displayList, _cardTemplate);
        renderDeck(_fullList, _deckCardTemplate);
    };

    const onCsvSelected = function(event) {
        const fileHandle = event.currentTarget.files[0];

        const reader = new FileReader();

        reader.addEventListener("load", onCsvLoad);
        reader.readAsText(fileHandle);
    };

    const onExportClick = function(event) {
        // Can't save the deck without a file name for it.
        const el = document.querySelector("[name='deckName']")
        if (!el || !el.value) {
            return;
        }

        const csv = encodeURI(buildCsv(_fullList));

        const link = document.createElement("a");
        link.setAttribute("href", csv);
        link.setAttribute("download", `${el.value}.csv`);
        document.body.appendChild(link);

        link.click();

        link.parentElement.removeChild(link);
    };

    const events = [
        ["click", "add", onAddClick],
        ["click", "remove", onRemoveClick],
        ["click", "export", onExportClick],
        ["change", "types", onFilterChange],
        ["change", "types_2", onFilterChange],
        ["change", "needs", onFilterChange],
        ["change", "fills", onFilterChange],
        ["change", "load", onCsvSelected]
    ];

    const santiseForFilename = function(name) {
        return name.replace(/[^a-z0-9]/gi, '_');
    }

    const getDeckLength = function(list) {
        return list.reduce(function(memo, card) {
            return memo + (card.quantity || 0);
        }, 0);
    };

    const loadCardList = async function() {
        return await sendHttpRequest("/cards.json", "GET")
        .then(function(response) {
            const cards = JSON.parse(response.responseText).cards;
            cards.forEach(function(card) {
                card.disabled = "";
                card.identity = santiseForFilename(card.name);
            });
            return cards;
        });
    };

    const loadFile = async function(fileName) {
        return await sendHttpRequest(`/editor/${fileName}`, "GET")
        .then(function(response) {
            return response.responseText;
        });
    }

    const loadDeckCardTemplate = async function() {
        return await sendHttpRequest("/editor/deckItem.html", "GET")
        .then(function(response) {
            return response.responseText;
        });
    }

    const filterList = function(list) {
        // Filters are ANDed together.
        if (currentFilters.types) {
            list = list.filter(function(card) {
                return card.types.includes(currentFilters.types);
            });
        }

        if (currentFilters.types_2) {
            list = list.filter(function(card) {
                return card.types.includes(currentFilters.types_2);
            });
        }

        if (currentFilters.needs) {
            const providesRegex = new RegExp(`Provides.+alt="${currentFilters.needs}".+`);
            list = list.filter(function(card) {
                return (
                    card.needs.some(function(n) { return n.key === currentFilters.needs; })
                    || card.effects.some(function(e) { return providesRegex.test(e.text); })
                );
            });
        }

        if (currentFilters.fills) {
            list = list.filter(function(card) {
                let matches;
                if (currentFilters.fills === "Class") {
                    matches = ["C1", "C2", "C3", "C4"]
                } else {
                    matches = [currentFilters.fills];
                }

                return card.fills.some(function(n) { return matches.includes(n.key); });
            });
        }
        return list;
    };

    const sortList = function(list) {
        return list;
    }

    const renderDeck = function(list, template) {
        const container = document.getElementById("deckList");
        container.innerHTML = "";

        const deckDetails = {
            total: 0,
            limit: window.DeckEditor.DECK_LIMIT
        };

        list.forEach(function(card) {
            if (!card.quantity) {
                return;
            }

            card.disabledAttr = (card.quantity >= window.DeckEditor.COPY_LIMIT ? "disabled" : "");
            deckDetails.total += card.quantity || 0;

            let html = template;

            for(let key in card) {
                if(!card.hasOwnProperty(key)) {
                    continue;
                }

                html = html.replace(new RegExp("{" + key + "}", "g"), card[key]);
            }

            container.insertAdjacentHTML("beforeend", html);
        });

        if (deckDetails.total === deckDetails.limit) {
            deckDetails.class = "full";
        } else if (deckDetails.total > deckDetails.limit) {
            deckDetails.class = "over";
        }

        html = _deckDetailsTemplate;
        for(let key in deckDetails) {
            if(!deckDetails.hasOwnProperty(key)) {
                continue;
            }

            html = html.replace(new RegExp("{" + key + "}", "g"), deckDetails[key]);
        }

        const detailsContainer = document.getElementById("deckDetails");
        while(detailsContainer.firstChild) {
            detailsContainer.removeChild(detailsContainer.firstChild);
        }
        detailsContainer.insertAdjacentHTML("beforeend", html);
    };

    const renderListItem = function(card, container, template, disabledAttr, position) {
        let html = template;

        card.disabledAttr = disabledAttr || (card.quantity >= window.DeckEditor.COPY_LIMIT ? "disabled" : "");
        for(let key in card) {
            if(!card.hasOwnProperty(key)) {
                continue;
            }

            html = html.replace(new RegExp("{" + key + "}", "g"), card[key]);
        }

        container.insertAdjacentHTML(position || "beforeend", html);
    };

    const renderList = function(list, template) {
        const container = document.getElementById("filteredList");
        container.innerHTML = "";

        list.forEach(function(card) {
            renderListItem(card, container, template, null);
        });
    };

    const getAllFills = function(list) {
        return list.reduce(function(result, card) {
            card.fills.map(function(fill) {
                return fill.key;
            })
            .forEach(function(fill) {
                // Artifact of the card generation process.
                // TODO ... yeah.
                if (["slash", "and"].includes(fill)) {
                    return;
                }
                // This only needs to appear once.
                if (["C1", "C2", "C3", "C4"].includes(fill)) {
                    fill = "Class";
                }
                if (!result.includes(fill)) {
                    result.push(fill);
                }
            });
            return result;
        }, []);
    }

    const getAllNeeds = function(list) {
        return list.reduce(function(result, card) {
            card.needs.map(function(need) {
                return need.key;
            })
            .forEach(function(need) {
                if (!result.includes(need)) {
                    result.push(need);
                }
            });
            return result;
        }, []);
    }

    const getAllTypes = function(list) {
        return list.reduce(function(result, card) {
            const types = (card.types || "").split("/");
            types.forEach(function(type) {
                type = type.trim();
                if (!result.includes(type)) {
                    result.push(type);
                }
            });
            return result;
        }, []);
    };

    const getFilterValues = function(list, name) {
        switch(name) {
            case "types_2":
            case "types": return getAllTypes(list);
            case "fills": return getAllFills(list);
            case "needs": return getAllNeeds(list);
            default: throw new Error("What is this filter?", name);
        }
    };

    const renderFilters = function(list) {
        document.querySelectorAll("#filters select")
        .forEach(function(el) {
            const name = el.getAttribute("name");
            getFilterValues(list, name)
            .forEach(function(val) {
                const opt = document.createElement("option");
                opt.value = val;
                opt.innerText = val;
                el.appendChild(opt);
            });
        });
    };

    /** 
     * Move this to common place.
     */
    const bindEvents = function(events) {
        const event = 0;
        const name = 1;
        const handler = 2;

        events.forEach(function(ev) {
            const controls = document.querySelectorAll(`[name='${ev[name]}']`);
            controls.forEach(function(ctrl) {
                // Remove in case it was added previously.
                ctrl.removeEventListener(ev[event], ev[handler]);
                ctrl.addEventListener(ev[event], ev[handler]);
            });
        });
    }

    const response = await Promise.all([
        loadCardList(),
        loadFile("listItem.html"), 
        loadFile("deckDetails.html"),
        loadFile("deckItem.html"),
        loadFile("index.csv")
    ]);
    const _fullList = response[0];
    const _cardTemplate = response[1];
    const _deckDetailsTemplate = response[2];
    const _deckCardTemplate = response[3];
    const _foreignLinkCsv = response[4];

    // apply external images
    parseCsv(_foreignLinkCsv.split(/[\r\n]+/), true);

    renderFilters(_fullList);

    let displayList = filterList(_fullList);
    displayList = sortList(displayList);

    renderList(displayList, _cardTemplate);
    renderDeck(_fullList, _deckCardTemplate);

    bindEvents(events);
})();
