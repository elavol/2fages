// src/main.ts
import "./styles.css";
import { type Screen, renderNav } from "./ui/components";
import { renderHome } from "./ui/home";
import { renderAdd } from "./ui/add";
import { renderImportExport } from "./ui/import-export";
import { renderSettings } from "./ui/settings";
import { loadEncrypted, saveEncrypted, isStorageAvailable } from "./storage";
import { stopScanner } from "./qr";

let currentScreen: Screen = "home";
let memoryVault: string | null = null;
let storageAvailable = false;

function getEncryptedVault(): string | null {
  if (storageAvailable) {
    return loadEncrypted();
  }
  return memoryVault;
}

function saveVault(encrypted: string): void {
  if (storageAvailable) {
    saveEncrypted(encrypted);
  }
  memoryVault = encrypted;
}

function navigate(screen: Screen): void {
  stopScanner();
  currentScreen = screen;
  render();
}

function render(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = "";

  const nav = renderNav(currentScreen, navigate);
  app.appendChild(nav);

  const content = document.createElement("main");
  app.appendChild(content);

  const callbacks = {
    onNavigate: navigate,
    onVaultChanged: () => render(),
    getEncryptedVault,
    saveVault,
  };

  switch (currentScreen) {
    case "home":
      renderHome(content, callbacks);
      break;
    case "add":
      renderAdd(content, callbacks);
      break;
    case "import-export":
      renderImportExport(content, callbacks);
      break;
    case "settings":
      renderSettings(content, callbacks);
      break;
  }
}

// Initialize
storageAvailable = isStorageAvailable();
if (!storageAvailable) {
  import("./ui/components").then(({ showToast }) =>
    showToast("Storage unavailable — vault will not persist between sessions", 5000)
  );
}

// Load from storage into memory on startup
if (storageAvailable) {
  memoryVault = loadEncrypted();
}

render();
