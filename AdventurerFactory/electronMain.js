const electron = require("electron");
const { app, BrowserWindow, screen } = require("electron");

const createWindow = () => {

    const display = screen.getPrimaryDisplay()

    const win = new BrowserWindow({
        width: display.size.width,
        height: display.size.height
    });

    win.loadFile("editor/index.html");
};

app.whenReady()
.then(() => {
    createWindow();
});
