// src/main.ts
import "./styles.css";
import type { Vault } from "./types";
import { type Screen, renderNav } from "./ui/components";
import { renderHome } from "./ui/home";
import { renderAdd } from "./ui/add";
import { renderImportExport } from "./ui/import-export";
import { renderSettings } from "./ui/settings";
import { loadEncrypted, saveEncrypted, isStorageAvailable } from "./storage";
import { stopScanner } from "./qr";

let currentScreen: Screen = "home";
let memoryVault: string | null = null;
let cachedVault: Vault | null = null;
let storageAvailable = false;

// Auto-lock: flush decrypted vault from memory after inactivity
const AUTO_LOCK_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_CHECK_MS = 30_000;
let lastActivityTime = 0;
let autoLockIntervalId: ReturnType<typeof setInterval> | null = null;

function resetActivityTimer(): void {
  lastActivityTime = Date.now();
}

function lockVault(): void {
  cachedVault = null;
  stopAutoLock();
  if (currentScreen === "home") {
    render();
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible" && cachedVault !== null) {
    if (Date.now() - lastActivityTime >= AUTO_LOCK_MS) {
      lockVault();
    }
  }
}

function startAutoLock(): void {
  stopAutoLock();
  lastActivityTime = Date.now();
  for (const evt of ["click", "keydown", "touchstart", "scroll"] as const) {
    document.addEventListener(evt, resetActivityTimer, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  autoLockIntervalId = setInterval(() => {
    if (cachedVault !== null && Date.now() - lastActivityTime >= AUTO_LOCK_MS) {
      lockVault();
    }
  }, ACTIVITY_CHECK_MS);
}

function stopAutoLock(): void {
  for (const evt of ["click", "keydown", "touchstart", "scroll"] as const) {
    document.removeEventListener(evt, resetActivityTimer);
  }
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (autoLockIntervalId !== null) {
    clearInterval(autoLockIntervalId);
    autoLockIntervalId = null;
  }
}

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

function clearVault(): void {
  import("./storage").then(({ clearStorage }) => clearStorage());
  memoryVault = null;
  cachedVault = null;
  stopAutoLock();
}

function navigate(screen: Screen): void {
  stopScanner();
  currentScreen = screen;
  render();
}

function render(): void {
  const app = document.getElementById("app")!;

  // Clean up any active TOTP intervals from previous screen
  const prevMain = app.querySelector("main");
  if (prevMain && (prevMain as any).__cleanup) {
    (prevMain as any).__cleanup();
  }

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
    clearVault,
    getCachedVault: () => cachedVault,
    setCachedVault: (v: Vault | null) => {
      cachedVault = v;
      if (v) startAutoLock(); else stopAutoLock();
    },
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
