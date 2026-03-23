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
        // Bubble cleanup up to the container (<main> element)
        if ((div as any).__cleanup) {
          (container as any).__cleanup = (div as any).__cleanup;
        }
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
  // Track intervals for cleanup on navigate
  const activeIntervals: ReturnType<typeof setInterval>[] = [];
  (container as any).__cleanup = () => {
    activeIntervals.forEach((id) => clearInterval(id));
    activeIntervals.length = 0;
  };

  if (vault.length === 0) {
    const p = document.createElement("p");
    p.className = "text-center text-secondary";
    p.textContent = "No accounts yet. Add one from the menu.";
    container.appendChild(p);
    return;
  }

  // Build flat list
  interface FlatAccount {
    namespace: string;
    account: Account;
    displayName: string;
  }

  const flatAccounts: FlatAccount[] = [];
  for (const ns of vault) {
    for (const acc of ns.accounts) {
      flatAccounts.push({
        namespace: ns.name,
        account: acc,
        displayName: ns.name ? `${ns.name}/${acc.name}` : acc.name,
      });
    }
  }

  flatAccounts.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const list = document.createElement("div");
  list.className = "account-list";

  for (const { namespace, account, displayName } of flatAccounts) {
    const period = getPeriod(account.timePeriod);
    const card = document.createElement("div");
    card.className = "account-card";

    // Top row: name + TOTP code
    const topRow = document.createElement("div");
    topRow.className = "account-top-row";

    const nameEl = document.createElement("div");
    nameEl.className = "account-name";
    nameEl.textContent = displayName;

    const codeEl = document.createElement("div");
    codeEl.className = "inline-totp-code";
    codeEl.setAttribute("role", "button");
    codeEl.setAttribute("aria-label", "Copy code");
    codeEl.title = "Tap to copy";

    // Format code with space in middle (e.g., "123 456")
    function formatCode(code: string): string {
      const mid = Math.ceil(code.length / 2);
      return code.slice(0, mid) + " " + code.slice(mid);
    }

    // Generate initial code
    let currentCode = generateCode(account);
    codeEl.textContent = formatCode(currentCode);

    // Copy on tap — always uses currentCode closure
    codeEl.addEventListener("click", () => {
      copyToClipboard(currentCode).then((ok) => {
        if (ok) showToast("Copied!");
      });
    });

    topRow.append(nameEl, codeEl);

    // Timer bar
    const timerBar = document.createElement("div");
    timerBar.className = "inline-timer-bar";
    const timerFill = document.createElement("div");
    timerFill.className = "inline-timer-fill";
    timerBar.appendChild(timerFill);

    // Bottom row: Edit + Delete
    const actions = document.createElement("div");
    actions.className = "account-bottom-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      callbacks.onNavigate("add");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("2fages:edit-account", {
            detail: { namespace, account },
          })
        );
      }, 0);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon btn-danger-text";
    delBtn.textContent = "Del";
    delBtn.addEventListener("click", () => {
      showConfirmModal(
        "Delete Account",
        `Delete "${displayName}"?`,
        async () => {
          const ns = vault.find((n) => n.name === namespace);
          if (ns) {
            ns.accounts = ns.accounts.filter((a) => a !== account);
            if (ns.accounts.length === 0) {
              vault.splice(vault.indexOf(ns), 1);
            }
          }
          const { encrypt } = await import("../crypto");
          const newEncrypted = await encrypt(vault, passphrase);
          callbacks.saveVault(newEncrypted);
          callbacks.onVaultChanged();
        }
      );
    });

    actions.append(editBtn, delBtn);
    card.append(topRow, timerBar, actions);
    list.appendChild(card);

    // Update timer every second
    let lastPeriodIndex = Math.floor(Date.now() / 1000 / period);

    const updateTimer = () => {
      const remaining = getRemainingSeconds(period);
      const fraction = remaining / period;

      // Check for period rollover — skip transition on reset
      const currentPeriodIndex = Math.floor(Date.now() / 1000 / period);
      if (currentPeriodIndex !== lastPeriodIndex) {
        lastPeriodIndex = currentPeriodIndex;
        currentCode = generateCode(account);
        codeEl.textContent = formatCode(currentCode);

        // Reset bar without transition to avoid reverse-fill animation
        timerFill.style.transition = "none";
        timerFill.style.width = "100%";
        // Re-enable transition on next frame
        requestAnimationFrame(() => {
          timerFill.style.transition = "width 1s linear";
        });
      } else {
        timerFill.style.width = `${fraction * 100}%`;
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    activeIntervals.push(intervalId);
  }

  container.appendChild(list);
}
