// src/ui/home.ts
import type { Vault, Account } from "../types";
import { decrypt } from "../crypto";
import { generateCode, getRemainingSeconds } from "../totp";
import { getPeriod } from "../types";
import {
  type Screen,
  showPassphraseModal,
  showConfirmModal,
  showToast,
  copyToClipboard,
} from "./components";

interface HomeCallbacks {
  onNavigate: (screen: Screen) => void;
  onVaultChanged: () => void;
  getEncryptedVault: () => string | null;
  saveVault: (encrypted: string) => void;
}

export function renderHome(
  container: HTMLElement,
  callbacks: HomeCallbacks
): void {
  const encrypted = callbacks.getEncryptedVault();

  if (!encrypted) {
    renderEmptyState(container, callbacks);
    return;
  }

  renderVaultPrompt(container, encrypted, callbacks);
}

function renderEmptyState(
  container: HTMLElement,
  callbacks: HomeCallbacks
): void {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `
    <h2>Welcome to 2fages</h2>
    <p>Secure TOTP codes with age encryption</p>
    <div class="actions"></div>
  `;

  const actions = div.querySelector(".actions")!;

  const createBtn = document.createElement("button");
  createBtn.className = "btn-primary";
  createBtn.textContent = "Create New Vault";
  createBtn.addEventListener("click", () => {
    showPassphraseModal(
      "Create Vault",
      async (passphrase) => {
        const { encrypt } = await import("../crypto");
        const encrypted = await encrypt([], passphrase);
        callbacks.saveVault(encrypted);
        callbacks.onVaultChanged();
      },
      { confirm: true }
    );
  });

  const importBtn = document.createElement("button");
  importBtn.className = "btn-secondary";
  importBtn.textContent = "Import Credentials";
  importBtn.addEventListener("click", () => callbacks.onNavigate("import-export"));

  actions.append(createBtn, importBtn);
  container.appendChild(div);
}

function renderVaultPrompt(
  container: HTMLElement,
  encrypted: string,
  callbacks: HomeCallbacks
): void {
  // Show unlock prompt to display vault contents
  const div = document.createElement("div");

  const unlockBtn = document.createElement("button");
  unlockBtn.className = "btn-primary mb-16";
  unlockBtn.textContent = "Unlock Vault";
  unlockBtn.addEventListener("click", () => {
    showPassphraseModal("Unlock Vault", async (passphrase) => {
      try {
        const vault = await decrypt(encrypted, passphrase);
        div.innerHTML = "";
        renderVaultList(div, vault, encrypted, passphrase, callbacks);
      } catch {
        showToast("Incorrect passphrase");
      }
    });
  });

  div.appendChild(unlockBtn);
  container.appendChild(div);
}

function renderVaultList(
  container: HTMLElement,
  vault: Vault,
  _encrypted: string,
  passphrase: string,
  callbacks: HomeCallbacks
): void {
  if (vault.length === 0) {
    const p = document.createElement("p");
    p.className = "text-center text-secondary";
    p.textContent = "No accounts yet. Add one from the Add tab.";
    container.appendChild(p);
    return;
  }

  for (const ns of vault) {
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";
    const h3 = document.createElement("h3");
    h3.textContent = ns.name || "(default)";
    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "\u25B6";
    header.append(h3, chevron);

    const list = document.createElement("ul");
    list.className = "account-list";
    list.style.display = "none";

    let open = false;
    header.addEventListener("click", () => {
      open = !open;
      list.style.display = open ? "block" : "none";
      chevron.classList.toggle("open", open);
    });

    for (const account of ns.accounts) {
      const item = document.createElement("li");
      item.className = "account-item";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = account.name;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "account-actions";

      const codeBtn = document.createElement("button");
      codeBtn.textContent = "Code";
      codeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showTotpCode(container, account);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete";
      deleteBtn.textContent = "Del";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showConfirmModal(
          "Delete Account",
          `Delete "${account.name}" from "${ns.name}"?`,
          async () => {
            ns.accounts = ns.accounts.filter((a) => a !== account);
            if (ns.accounts.length === 0) {
              vault.splice(vault.indexOf(ns), 1);
            }
            const { encrypt } = await import("../crypto");
            const newEncrypted = await encrypt(vault, passphrase);
            callbacks.saveVault(newEncrypted);
            callbacks.onVaultChanged();
          }
        );
      });

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onNavigate("add");
        // Dispatch custom event with edit data after navigation
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("2fages:edit-account", {
              detail: { namespace: ns.name, account },
            })
          );
        }, 0);
      });

      actionsDiv.append(codeBtn, editBtn, deleteBtn);
      item.append(name, actionsDiv);
      list.appendChild(item);
    }

    // Namespace delete button
    const nsDeleteBtn = document.createElement("button");
    nsDeleteBtn.className = "btn-danger mt-16";
    nsDeleteBtn.textContent = `Delete "${ns.name}" namespace`;
    nsDeleteBtn.style.cssText = "font-size:12px;padding:6px 12px;width:auto;";
    nsDeleteBtn.addEventListener("click", () => {
      showConfirmModal(
        "Delete Namespace",
        `Delete "${ns.name}" and all ${ns.accounts.length} account(s) within it?`,
        async () => {
          vault.splice(vault.indexOf(ns), 1);
          const { encrypt } = await import("../crypto");
          const newEncrypted = await encrypt(vault, passphrase);
          callbacks.saveVault(newEncrypted);
          callbacks.onVaultChanged();
        }
      );
    });

    card.append(header, list, nsDeleteBtn);
    container.appendChild(card);
  }
}

function showTotpCode(container: HTMLElement, account: Account): void {
  const period = getPeriod(account.timePeriod);
  const code = generateCode(account);

  // Try clipboard
  copyToClipboard(code).then((ok) => {
    if (ok) showToast("Copied to clipboard");
  });

  const display = document.createElement("div");
  display.className = "totp-display card";

  const codeEl = document.createElement("div");
  codeEl.className = "totp-code";
  codeEl.textContent = code;

  const timerEl = document.createElement("div");
  timerEl.className = "totp-timer";

  const barOuter = document.createElement("div");
  barOuter.className = "totp-timer-bar";
  const barFill = document.createElement("div");
  barFill.className = "fill";
  barOuter.appendChild(barFill);

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "btn-secondary mt-16";
  dismissBtn.textContent = "Dismiss";
  dismissBtn.addEventListener("click", () => {
    clearInterval(interval);
    display.remove();
  });

  display.append(codeEl, timerEl, barOuter, dismissBtn);
  container.prepend(display);

  const updateTimer = () => {
    const remaining = getRemainingSeconds(period);
    timerEl.textContent = `Expires in ${remaining}s`;
    barFill.style.width = `${(remaining / period) * 100}%`;

    if (remaining === period) {
      // New period — regenerate code
      const newCode = generateCode(account);
      codeEl.textContent = newCode;
      copyToClipboard(newCode);
    }
  };

  updateTimer();
  const interval = setInterval(updateTimer, 1000);

  // Auto-dismiss after one full period
  setTimeout(() => {
    clearInterval(interval);
    display.remove();
    // Clear clipboard
    copyToClipboard("");
  }, period * 1000);
}
