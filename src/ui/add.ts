// src/ui/add.ts
import type { Account, Vault } from "../types";
import { decrypt, encrypt } from "../crypto";
import { parseOtpauthUri } from "../totp";
import { startScanner, stopScanner } from "../qr";
import { type Screen, showPassphraseModal, showToast } from "./components";

interface AddCallbacks {
  getEncryptedVault: () => string | null;
  saveVault: (encrypted: string) => void;
  onNavigate: (screen: Screen) => void;
}

export function renderAdd(
  container: HTMLElement,
  callbacks: AddCallbacks
): void {
  const div = document.createElement("div");

  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = "Add Account";
  div.appendChild(title);

  // Tab toggle: Manual / Scan QR
  const tabBar = document.createElement("div");
  tabBar.style.cssText = "display:flex;gap:8px;margin-bottom:16px;";

  const manualTab = document.createElement("button");
  manualTab.className = "btn-primary";
  manualTab.textContent = "Manual Entry";

  const qrTab = document.createElement("button");
  qrTab.className = "btn-secondary";
  qrTab.textContent = "Scan QR Code";

  tabBar.append(manualTab, qrTab);
  div.appendChild(tabBar);

  const formContainer = document.createElement("div");
  div.appendChild(formContainer);

  const showManual = () => {
    manualTab.className = "btn-primary";
    qrTab.className = "btn-secondary";
    stopScanner();
    formContainer.innerHTML = "";
    renderManualForm(formContainer, callbacks);
  };

  const showQr = () => {
    qrTab.className = "btn-primary";
    manualTab.className = "btn-secondary";
    formContainer.innerHTML = "";
    renderQrScanner(formContainer, callbacks);
  };

  manualTab.addEventListener("click", showManual);
  qrTab.addEventListener("click", showQr);

  showManual();
  container.appendChild(div);
}

function renderManualForm(
  container: HTMLElement,
  callbacks: AddCallbacks
): void {
  const form = document.createElement("form");

  const fields = [
    { id: "namespace", label: "Namespace", type: "text", placeholder: "e.g. bitwarden", required: true },
    { id: "account-name", label: "Account Name", type: "text", placeholder: "e.g. user@email.com", required: true },
    { id: "secret", label: "Secret (Base32)", type: "text", placeholder: "e.g. JBSWY3DPEHPK3PXP", required: true },
  ];

  for (const field of fields) {
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.setAttribute("for", `add-${field.id}`);
    const input = document.createElement("input");
    input.type = field.type;
    input.id = `add-${field.id}`;
    input.placeholder = field.placeholder;
    input.required = field.required;
    input.autocomplete = "off";
    group.append(label, input);
    form.appendChild(group);
  }

  // Algorithm select
  const algoGroup = document.createElement("div");
  algoGroup.className = "form-group";
  const algoLabel = document.createElement("label");
  algoLabel.textContent = "Algorithm";
  algoLabel.setAttribute("for", "add-algorithm");
  const algoSelect = document.createElement("select");
  algoSelect.id = "add-algorithm";
  for (const opt of ["SHA1", "SHA256", "SHA512"]) {
    const option = document.createElement("option");
    option.value = opt === "SHA1" ? "" : opt.toLowerCase();
    option.textContent = opt;
    algoSelect.appendChild(option);
  }
  algoGroup.append(algoLabel, algoSelect);
  form.appendChild(algoGroup);

  // Digits
  const digitsGroup = document.createElement("div");
  digitsGroup.className = "form-group";
  const digitsLabel = document.createElement("label");
  digitsLabel.textContent = "Digits";
  digitsLabel.setAttribute("for", "add-digits");
  const digitsInput = document.createElement("input");
  digitsInput.type = "number";
  digitsInput.id = "add-digits";
  digitsInput.value = "6";
  digitsInput.min = "6";
  digitsInput.max = "8";
  digitsGroup.append(digitsLabel, digitsInput);
  form.appendChild(digitsGroup);

  // Period
  const periodGroup = document.createElement("div");
  periodGroup.className = "form-group";
  const periodLabel = document.createElement("label");
  periodLabel.textContent = "Period (seconds)";
  periodLabel.setAttribute("for", "add-period");
  const periodInput = document.createElement("input");
  periodInput.type = "number";
  periodInput.id = "add-period";
  periodInput.value = "30";
  periodInput.min = "1";
  periodGroup.append(periodLabel, periodInput);
  form.appendChild(periodGroup);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn-primary";
  submitBtn.textContent = "Add Account";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const namespace = (document.getElementById("add-namespace") as HTMLInputElement).value.trim();
    const name = (document.getElementById("add-account-name") as HTMLInputElement).value.trim();
    const secret = (document.getElementById("add-secret") as HTMLInputElement).value.trim().replace(/\s/g, "");
    const algorithm = (document.getElementById("add-algorithm") as HTMLSelectElement).value;
    const digits = parseInt((document.getElementById("add-digits") as HTMLInputElement).value) || 6;
    const period = parseInt((document.getElementById("add-period") as HTMLInputElement).value) || 30;

    saveAccountToVault(
      callbacks,
      namespace,
      {
        name,
        token: secret,
        prefix: "",
        algorithm,
        length: digits,
        timePeriod: period === 30 ? 0 : period,
      }
    );
  });

  container.appendChild(form);
}

function renderQrScanner(
  container: HTMLElement,
  callbacks: AddCallbacks
): void {
  const readerDiv = document.createElement("div");
  readerDiv.id = "qr-reader";
  container.appendChild(readerDiv);

  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.style.display = "none";
  container.appendChild(errorDiv);

  startScanner(
    "qr-reader",
    (decodedText) => {
      try {
        const parsed = parseOtpauthUri(decodedText);
        saveAccountToVault(callbacks, parsed.namespace, parsed.account);
      } catch {
        errorDiv.textContent = "Invalid QR code. Expected an otpauth:// URI.";
        errorDiv.style.display = "block";
      }
    },
    (error) => {
      errorDiv.textContent = error;
      errorDiv.style.display = "block";
    }
  );
}

function saveAccountToVault(
  callbacks: AddCallbacks,
  namespace: string,
  account: Account
): void {
  showPassphraseModal("Enter Vault Passphrase", async (passphrase) => {
    try {
      const encrypted = callbacks.getEncryptedVault();
      let vault: Vault = [];

      if (encrypted) {
        vault = await decrypt(encrypted, passphrase);
      }

      // Find or create namespace
      let ns = vault.find((n) => n.name === namespace);
      if (!ns) {
        ns = { name: namespace, accounts: [] };
        vault.push(ns);
      }

      ns.accounts.push(account);

      const newEncrypted = await encrypt(vault, passphrase);
      callbacks.saveVault(newEncrypted);
      showToast(`Saved ${account.name} to ${namespace}`);
      callbacks.onNavigate("home");
    } catch {
      showToast("Incorrect passphrase");
    }
  });
}
