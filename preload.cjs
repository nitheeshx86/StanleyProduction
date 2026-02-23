const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    getWorkingDirectory: () => ipcRenderer.invoke("get-working-dir"),
    setWorkingDirectory: () => ipcRenderer.invoke("set-working-dir"),
    saveCase: (caseData) => ipcRenderer.invoke("save-case", caseData),
    saveCaseDialog: (caseData) => ipcRenderer.invoke("save-case-dialog", caseData),
    listCases: () => ipcRenderer.invoke("list-cases"),
    deleteCase: (id) => ipcRenderer.invoke("delete-case", id),
});
