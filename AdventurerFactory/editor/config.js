(function() {
    if (!window.DeckEditor) {
        const cfg = {};

        cfg.SCRIPT_LOAD_TIMEOUT = 5000;
        cfg.COPY_LIMIT = 4;
        cfg.DECK_LIMIT = 40;

        window.DeckEditor = cfg;
    }
})();