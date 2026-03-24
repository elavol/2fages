// src/ui/import-export.ts
import type { Vault } from "../types";
import { decrypt } from "../crypto";
import { type Screen, showPassphraseModal, showToast, copyToClipboard } from "./components";

interface ImportExportCallbacks {
  getEncryptedVault: () => string | null;
  saveVault: (encrypted: string) => void;
  onVaultChanged: () => void;
  onNavigate: (screen: Screen) => void;
  setCachedVault: (v: Vault | null) => void;
}

export function renderImportExport(
  container: HTMLElement,
  callbacks: ImportExportCallbacks
): void {
  const div = document.createElement("div");

  // --- Import Section ---
  const importTitle = document.createElement("h2");
  importTitle.className = "section-title";
  importTitle.textContent = "Import";
  div.appendChild(importTitle);

  const hasExisting = callbacks.getEncryptedVault() !== null;

  if (hasExisting) {
    const warning = document.createElement("div");
    warning.className = "warning";
    warning.textContent =
      "You have existing credentials. Export them first before importing, as import will replace current data.";
    div.appendChild(warning);
  }

  // Paste textarea
  const pasteGroup = document.createElement("div");
  pasteGroup.className = "form-group";
  const pasteLabel = document.createElement("label");
  pasteLabel.textContent = "Paste encrypted credentials";
  pasteLabel.setAttribute("for", "import-paste");
  const textarea = document.createElement("textarea");
  textarea.id = "import-paste";
  textarea.placeholder = "-----BEGIN AGE ENCRYPTED FILE-----\n...";
  pasteGroup.append(pasteLabel, textarea);
  div.appendChild(pasteGroup);

  const importPasteBtn = document.createElement("button");
  importPasteBtn.className = "btn-primary mb-16";
  importPasteBtn.textContent = "Import from Text";
  importPasteBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) {
      showToast("Please paste encrypted credentials");
      return;
    }
    if (!text.includes("-----BEGIN AGE ENCRYPTED FILE-----")) {
      showToast("Invalid format — expected age-encrypted text");
      return;
    }
    importAndUnlock(text, callbacks);
  });
  div.appendChild(importPasteBtn);

  // File upload
  const fileGroup = document.createElement("div");
  fileGroup.className = "form-group";
  const fileLabel = document.createElement("label");
  fileLabel.textContent = "Or upload .age file";
  fileLabel.setAttribute("for", "import-file");
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "import-file";
  fileInput.accept = ".age,.txt";
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string).trim();
      if (!text.includes("-----BEGIN AGE ENCRYPTED FILE-----")) {
        showToast("Invalid file — expected age-encrypted text");
        return;
      }
      importAndUnlock(text, callbacks);
    };
    reader.readAsText(file);
  });
  fileGroup.append(fileLabel, fileInput);
  div.appendChild(fileGroup);

  // --- Export Section ---
  const exportTitle = document.createElement("h2");
  exportTitle.className = "section-title mt-16";
  exportTitle.textContent = "Export";
  div.appendChild(exportTitle);

  const encrypted = callbacks.getEncryptedVault();

  if (!encrypted) {
    const p = document.createElement("p");
    p.className = "text-secondary text-sm";
    p.textContent = "No credentials to export.";
    div.appendChild(p);
  } else {
    const exportActions = document.createElement("div");
    exportActions.style.cssText = "display:flex;flex-direction:column;gap:12px;";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-primary";
    downloadBtn.textContent = "Download .age File";
    downloadBtn.addEventListener("click", () => {
      const blob = new Blob([encrypted], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "2fages-credentials.age";
      a.click();
      URL.revokeObjectURL(url);
      showToast("File downloaded");
    });

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-secondary";
    copyBtn.textContent = "Copy to Clipboard";
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(encrypted);
      showToast(ok ? "Copied to clipboard" : "Failed to copy");
    });

    exportActions.append(downloadBtn, copyBtn);
    div.appendChild(exportActions);
  }

  container.appendChild(div);
}

function importAndUnlock(
  encryptedText: string,
  callbacks: ImportExportCallbacks
): void {
  callbacks.saveVault(encryptedText);
  showPassphraseModal("Enter Passphrase", async (passphrase) => {
    try {
      const vault = await decrypt(encryptedText, passphrase);
      callbacks.setCachedVault(vault);
      callbacks.onNavigate("home");
      showToast("Credentials imported");
    } catch {
      showToast("Incorrect passphrase");
    }
  }, { submitLabel: "Unlock" });
}
