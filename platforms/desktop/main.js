/* Gatefall desktop shell (Electron). Loads the game from app://gatefall/ (files in ./app, made by
   `npm run web`), so saved decks persist and the room server sees a stable origin. No Node access for the page. */
const { app, BrowserWindow, protocol, net, shell, Menu } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_DIR = path.join(__dirname, "app");
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow(){
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 360, minHeight: 560,
    backgroundColor: "#0c1117", title: "Gatefall", autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  win.once("ready-to-show", () => win.show());
  // links to other websites open in the normal browser; the game window never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://gatefall/")){ e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  // F11 toggles full screen (the in-game full-screen button works too)
  win.webContents.on("before-input-event", (e, input) => { if (input.type === "keyDown" && input.key === "F11"){ win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.loadURL("app://gatefall/index.html");
  return win;
}

app.whenReady().then(() => {
  protocol.handle("app", req => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(APP_DIR, decodeURIComponent(pathname)));
    if (!file.startsWith(APP_DIR + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("second-instance", () => { const [w] = BrowserWindow.getAllWindows(); if (w){ if (w.isMinimized()) w.restore(); w.focus(); } });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
