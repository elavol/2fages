// src/ui/settings.ts
import { decrypt, encrypt } from "../crypto";
import {
  showPassphraseModal,
  showConfirmModal,
  showToast,
} from "./components";

interface SettingsCallbacks {
  getEncryptedVault: () => string | null;
  saveVault: (encrypted: string) => void;
  clearVault: () => void;
  onVaultChanged: () => void;
}

export function renderSettings(
  container: HTMLElement,
  callbacks: SettingsCallbacks
): void {
  const div = document.createElement("div");

  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = "Settings";
  div.appendChild(title);

  const hasVault = callbacks.getEncryptedVault() !== null;

  // Change passphrase
  if (hasVault) {
    const changeBtn = document.createElement("button");
    changeBtn.className = "btn-primary mb-16";
    changeBtn.textContent = "Change Passphrase";
    changeBtn.addEventListener("click", () => {
      showPassphraseModal("Current Passphrase", async (oldPass) => {
        try {
          const encrypted = callbacks.getEncryptedVault()!;
          const vault = await decrypt(encrypted, oldPass);

          showPassphraseModal(
            "New Passphrase",
            async (newPass) => {
              const newEncrypted = await encrypt(vault, newPass);
              callbacks.saveVault(newEncrypted);
              showToast("Passphrase changed");
            },
            { confirm: true, submitLabel: "Change Passphrase" }
          );
        } catch {
          showToast("Incorrect passphrase");
        }
      }, { submitLabel: "Continue" });
    });
    div.appendChild(changeBtn);
  }

  // Clear vault
  if (hasVault) {
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn-danger mb-16";
    clearBtn.textContent = "Clear Vault";
    clearBtn.addEventListener("click", () => {
      showConfirmModal(
        "Clear Vault",
        "This will permanently delete all stored credentials from this device. Make sure you have exported your data first.",
        () => {
          callbacks.clearVault();
          callbacks.onVaultChanged();
          showToast("Vault cleared");
        },
        "Clear All Data"
      );
    });
    div.appendChild(clearBtn);
  }

  // About
  const about = document.createElement("div");
  about.className = "card mt-16";
  about.innerHTML = `
    <h3 style="font-size:16px;margin-bottom:8px;">About 2fages</h3>
    <p class="text-secondary text-sm">
      TOTP code generator with age encryption.<br/>
      Compatible with <a href="https://github.com/yitsushi/totp-cli" target="_blank" rel="noopener">totp-cli</a>.<br/>
      <a href="https://github.com/elavol/2fages" target="_blank" rel="noopener">Source code on GitHub</a><br/>
      v0.1.0
    </p>
  `;
  div.appendChild(about);

  container.appendChild(div);
}
