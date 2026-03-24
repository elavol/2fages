// src/ui/home.ts
import type { Vault, Account } from "../types";
import { decrypt, encrypt } from "../crypto";
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
  getCachedVault: () => Vault | null;
  setCachedVault: (v: Vault | null) => void;
}

export function renderHome(
  container: HTMLElement,
  callbacks: HomeCallbacks
): void {
  const cached = callbacks.getCachedVault();
  if (cached) {
    renderVaultList(container, cached, callbacks);
    return;
  }

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
  div.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 120px)";

  const unlockBtn = document.createElement("button");
  unlockBtn.className = "btn-primary mb-16";
  unlockBtn.style.maxWidth = "300px";
  unlockBtn.textContent = "Unlock Vault";
  unlockBtn.addEventListener("click", () => {
    showPassphraseModal("Unlock Vault", async (passphrase) => {
      try {
        const vault = await decrypt(encrypted, passphrase);
        callbacks.setCachedVault(vault);
        div.innerHTML = "";
        div.style.cssText = "";
        renderVaultList(div, vault, callbacks);
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
      showEditModal(namespace, account, vault, callbacks);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon btn-danger-text";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      showConfirmModal(
        "Delete Account",
        `Delete "${displayName}"?`,
        () => {
          showPassphraseModal("Enter Passphrase", async (passphrase) => {
            try {
              const ns = vault.find((n) => n.name === namespace);
              if (ns) {
                ns.accounts = ns.accounts.filter((a) => a !== account);
                if (ns.accounts.length === 0) {
                  vault.splice(vault.indexOf(ns), 1);
                }
              }
              const newEncrypted = await encrypt(vault, passphrase);
              callbacks.saveVault(newEncrypted);
              callbacks.setCachedVault(vault);
              callbacks.onVaultChanged();
            } catch {
              showToast("Incorrect passphrase");
            }
          }, { submitLabel: "Continue" });
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

function showEditModal(
  oldNamespace: string,
  account: Account,
  vault: Vault,
  callbacks: HomeCallbacks
): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const h2 = document.createElement("h2");
  h2.textContent = "Edit Account";
  modal.appendChild(h2);

  const form = document.createElement("form");

  const fields = [
    { id: "edit-namespace", label: "Namespace", value: oldNamespace },
    { id: "edit-name", label: "Account Name", value: account.name },
    { id: "edit-secret", label: "Secret (Base32)", value: account.token },
  ];

  for (const f of fields) {
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.textContent = f.label;
    label.setAttribute("for", f.id);
    const input = document.createElement("input");
    input.type = "text";
    input.id = f.id;
    input.value = f.value;
    input.required = true;
    input.autocomplete = "off";
    group.append(label, input);
    form.appendChild(group);
  }

  // Algorithm select
  const algoGroup = document.createElement("div");
  algoGroup.className = "form-group";
  const algoLabel = document.createElement("label");
  algoLabel.textContent = "Algorithm";
  algoLabel.setAttribute("for", "edit-algorithm");
  const algoSelect = document.createElement("select");
  algoSelect.id = "edit-algorithm";
  for (const opt of ["SHA1", "SHA256", "SHA512"]) {
    const option = document.createElement("option");
    option.value = opt === "SHA1" ? "" : opt.toLowerCase();
    option.textContent = opt;
    algoSelect.appendChild(option);
  }
  algoSelect.value = account.algorithm;
  algoGroup.append(algoLabel, algoSelect);
  form.appendChild(algoGroup);

  // Digits
  const digitsGroup = document.createElement("div");
  digitsGroup.className = "form-group";
  const digitsLabel = document.createElement("label");
  digitsLabel.textContent = "Digits";
  digitsLabel.setAttribute("for", "edit-digits");
  const digitsInput = document.createElement("input");
  digitsInput.type = "number";
  digitsInput.id = "edit-digits";
  digitsInput.value = String(account.length || 6);
  digitsInput.min = "6";
  digitsInput.max = "8";
  digitsGroup.append(digitsLabel, digitsInput);
  form.appendChild(digitsGroup);

  // Period
  const periodGroup = document.createElement("div");
  periodGroup.className = "form-group";
  const periodLabel = document.createElement("label");
  periodLabel.textContent = "Period (seconds)";
  periodLabel.setAttribute("for", "edit-period");
  const periodInput = document.createElement("input");
  periodInput.type = "number";
  periodInput.id = "edit-period";
  periodInput.value = String(account.timePeriod || 30);
  periodInput.min = "1";
  periodGroup.append(periodLabel, periodInput);
  form.appendChild(periodGroup);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "Save";

  actions.append(cancelBtn, saveBtn);
  form.appendChild(actions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newNamespace = (document.getElementById("edit-namespace") as HTMLInputElement).value.trim();
    const newName = (document.getElementById("edit-name") as HTMLInputElement).value.trim();
    const newSecret = (document.getElementById("edit-secret") as HTMLInputElement).value.trim().replace(/\s/g, "");
    const newAlgorithm = (document.getElementById("edit-algorithm") as HTMLSelectElement).value;
    const newDigits = parseInt((document.getElementById("edit-digits") as HTMLInputElement).value) || 6;
    const newPeriod = parseInt((document.getElementById("edit-period") as HTMLInputElement).value) || 30;

    overlay.remove();

    showPassphraseModal("Enter Passphrase", async (passphrase) => {
      try {
        // Remove old account
        const oldNs = vault.find((n) => n.name === oldNamespace);
        if (oldNs) {
          oldNs.accounts = oldNs.accounts.filter((a) => a !== account);
          if (oldNs.accounts.length === 0) {
            vault.splice(vault.indexOf(oldNs), 1);
          }
        }

        // Add updated account
        let ns = vault.find((n) => n.name === newNamespace);
        if (!ns) {
          ns = { name: newNamespace, accounts: [] };
          vault.push(ns);
        }
        ns.accounts.push({
          name: newName,
          token: newSecret,
          prefix: account.prefix,
          algorithm: newAlgorithm,
          length: newDigits,
          timePeriod: newPeriod === 30 ? 0 : newPeriod,
        });

        const newEncrypted = await encrypt(vault, passphrase);
        callbacks.saveVault(newEncrypted);
        callbacks.setCachedVault(vault);
        callbacks.onVaultChanged();
        showToast("Account updated");
      } catch {
        showToast("Incorrect passphrase");
      }
    }, { submitLabel: "Continue" });
  });

  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", onEscape);
    }
  };
  document.addEventListener("keydown", onEscape);
}
