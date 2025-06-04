// Main logic of the application.
(async function() {
    let currentFilters = {};
    const _deckList = [];

    const onAddClick = function(event) {
        const cardId = event.currentTarget.getAttribute("data-cardid")

        const fnFind = function(card) {
            return card.identity === cardId;
        };

        const card = _fullList.find(fnFind);

        let deckCard = _deckList.find(fnFind);

        if (!deckCard) {
            deckCard = structuredClone(card);
            deckCard.quantity = 0;
            _deckList.push(card);
        }

        deckCard.quantity++;

        renderDeck(_deckList, _deckCardTemplate);
    };

    const onFilterChange = function(event) {
        currentFilters = {};
        document.querySelectorAll("#filters select")
        .forEach(function(el) {
            const name = el.getAttribute("name");
            if (el.value !== "Any") {
                currentFilters[el.getAttribute("name")] = el.value;
            }
        });

        let displayList = filterList(_fullList);
        displayList = sortList(displayList);

        renderList(displayList, _cardTemplate);
        bindEvents(events);
    }

    const events = [
        ["click", "add", onAddClick],
        ["change", "types", onFilterChange],
        ["change", "types_2", onFilterChange],
        ["change", "needs", onFilterChange],
        ["change", "fills", onFilterChange]
    ];

    const santiseForFilename = function(name) {
        return name.replace(/[^a-z0-9]/gi, '_');
    }

    const loadCardList = async function() {
        return await sendHttpRequest("/cards.json", "GET")
        .then(function(response) {
            const cards = JSON.parse(response.responseText).cards;
            cards.forEach(function(card) {
                card.identity = santiseForFilename(card.name);
            });
            return cards;
        });
    };

    const loadCardTemplate = async function() {
        return await sendHttpRequest("/editor/listItem.html", "GET")
        .then(function(response) {
            return response.responseText;
        });
    };

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
        list.forEach(function(card) {
            let html;

            for(let key in card) {
                if(!card.hasOwnProperty(key)) {
                    continue;
                }

                html = template.replace(new RegExp("{" + key + "}", "g"), card[key]);
            }

            container.insertAdjacentHTML("beforeend", html);
        });
    };

    const renderList = function(list, template) {
        const container = document.getElementById("filteredList");
        container.innerHTML = "";
        list.forEach(function(card) {
            let html;

            for(let key in card) {
                if(!card.hasOwnProperty(key)) {
                    continue;
                }

                html = template.replace(new RegExp("{" + key + "}", "g"), card[key]);
            }

            container.insertAdjacentHTML("beforeend", html);
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
        loadCardList(), loadCardTemplate(), loadDeckCardTemplate()
    ]);
    const _fullList = response[0];
    const _cardTemplate = response[1];
    const _deckCardTemplate = response[2];

    renderFilters(_fullList);

    let displayList = filterList(_fullList);
    displayList = sortList(displayList);

    renderList(displayList, _cardTemplate);
    renderDeck(_deckList, _deckCardTemplate);

    bindEvents(events);
})();
