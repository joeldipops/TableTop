// Main logic of the application.
(async function() {
    const onAddClick = function(event) {
        alert(`Clicked: ${event.currentTarget.getAttribute("data-cardid")}`);
    };

    const events = [
        ["click", "add", onAddClick]
    ];

    const santiseForFilename = function(name) {
        return name.replace(/[^a-z0-9]/gi, '_');
    }

    const loadCardList = async function() {
        return await sendHttpRequest("/cards.json", "GET")
        .then(function(response) {
            return JSON.parse(response.responseText).cards;
        });
    };

    const loadCardTemplate = async function() {
        return await sendHttpRequest("/editor/listItem.html", "GET")
        .then(function(response) {
            return response.responseText;
        });
    };

    const filterList = function() {
        return _fullList;
    };

    const sortList = function(list) {
        return list;
    }

    const renderList = function(list, template) {
        const container = document.getElementById("filteredList");
        list.forEach(function(card) {
            card.identity = santiseForFilename(card.name);
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
                ctrl.addEventListener(ev[event], ev[handler]);
            });
        });
    }

    const response = await Promise.all([loadCardList(), loadCardTemplate()]);
    const _fullList = response[0];
    const _cardTemplate = response[1];

    let displayList = filterList(_fullList);
    displayList = sortList(displayList);

    renderList(displayList, _cardTemplate);

    bindEvents(events);
})();
