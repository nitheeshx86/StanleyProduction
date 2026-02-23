import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let workingDirectory = path.join(app.getPath("documents"), "LithoMap_Records");

// Ensure default directory exists
async function ensureDirectory(dir) {
    if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, "public", "logo.png"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.cjs"),
        },
    });

    // Support for Vite dev server during development
    if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5173");
        // Open dev tools in dev mode to help debug
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, "dist", "index.html"));
    }
}

// IPC Handlers for Local Storage
ipcMain.handle("get-working-dir", () => workingDirectory);

ipcMain.handle("set-working-dir", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
    });
    if (!result.canceled) {
        workingDirectory = result.filePaths[0];
        return workingDirectory;
    }
    return null;
});

ipcMain.handle("save-case-dialog", async (event, caseData) => {
    const defaultPath = path.join(app.getPath("documents"), `${caseData.name.replace(/\s+/g, "_") || "stone_analysis"}.json`);
    const result = await dialog.showSaveDialog({
        title: "Save Stone Analysis",
        defaultPath: defaultPath,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (!result.canceled && result.filePath) {
        const updatedData = { ...caseData, filePath: result.filePath };
        await fs.writeFile(result.filePath, JSON.stringify(updatedData, null, 2));
        return { filePath: result.filePath, updatedData };
    }
    return null;
});

ipcMain.handle("save-case", async (event, caseData) => {
    // If we have an explicit filePath (Saved via dialog), use it
    if (caseData.filePath) {
        await fs.writeFile(caseData.filePath, JSON.stringify(caseData, null, 2));
        return caseData.filePath;
    }

    // Otherwise save to internal records directory
    await ensureDirectory(workingDirectory);
    const fileName = `${caseData.id}.json`;
    const filePath = path.join(workingDirectory, fileName);
    await fs.writeFile(filePath, JSON.stringify(caseData, null, 2));
    return filePath;
});

ipcMain.handle("list-cases", async () => {
    if (!existsSync(workingDirectory)) return [];
    const files = await fs.readdir(workingDirectory);
    const cases = [];
    for (const file of files) {
        if (file.endsWith(".json")) {
            try {
                const content = await fs.readFile(path.join(workingDirectory, file), "utf-8");
                cases.push(JSON.parse(content));
            } catch (e) {
                console.error("Failed to read case:", file);
            }
        }
    }
    return cases;
});

ipcMain.handle("delete-case", async (event, id) => {
    const filePath = path.join(workingDirectory, `${id}.json`);
    if (existsSync(filePath)) {
        await fs.unlink(filePath);
        return true;
    }
    return false;
});

app.whenReady().then(async () => {
    await ensureDirectory(workingDirectory);
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
