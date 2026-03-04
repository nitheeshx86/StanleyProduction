import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let workingDirectory = null;

// Ensure directory exists
async function ensureDirectory(dir) {
    if (!dir) return;
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
        title: "Select System Working Directory for Records"
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

ipcMain.handle("save-case", async (event, caseData, notify = false) => {
    // 1. If we don't have a CWD, ask for one first (Very first save)
    if (!workingDirectory) {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory", "createDirectory"],
            title: "Choose a folder to save your records in"
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null; // Cancelled
        }
        workingDirectory = result.filePaths[0];
    }

    // 2. We have a working directory, let's determine the file path
    const sanitizedName = (caseData.name || caseData.id).replace(/[<>:"/\\|?*]/g, "_");
    const fileName = `${sanitizedName}.json`;
    const filePath = path.join(workingDirectory, fileName);

    // Check if it exists for the message box
    const exists = existsSync(filePath);

    // 3. Just write the file
    const updatedData = { ...caseData, filePath: filePath };

    try {
        await ensureDirectory(workingDirectory);
        await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));

        return {
            filePath,
            workingDirectory,
            updatedData,
            isOverwrite: exists
        };
    } catch (error) {
        if (notify) {
            await dialog.showErrorBox("Save Failed", error.message);
        }
        console.error("Failed to save case:", error);
        throw error;
    }
});

ipcMain.handle("list-cases", async () => {
    if (!workingDirectory || !existsSync(workingDirectory)) return [];
    try {
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
    } catch (err) {
        console.error("Failed to list cases:", err);
        return [];
    }
});

ipcMain.handle("delete-case", async (event, id) => {
    if (!workingDirectory) return false;

    // We search for the file with this ID in the working directory
    const files = await fs.readdir(workingDirectory);
    for (const file of files) {
        if (file.endsWith(".json")) {
            const content = await fs.readFile(path.join(workingDirectory, file), "utf-8");
            const data = JSON.parse(content);
            if (data.id === id) {
                await fs.unlink(path.join(workingDirectory, file));
                return true;
            }
        }
    }
    return false;
});

app.whenReady().then(async () => {
    // We no longer ensure default directory on startup since we want it to be null
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
