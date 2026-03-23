// src/ui/components.ts

// --- Navigation ---

export type Screen = "home" | "add" | "import-export" | "settings";

export function renderNav(
  active: Screen,
  onNavigate: (screen: Screen) => void
): HTMLElement {
  const nav = document.createElement("nav");
  const tabs: { id: Screen; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "add", label: "Add" },
    { id: "import-export", label: "Import/Export" },
    { id: "settings", label: "Settings" },
  ];

  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    if (tab.id === active) btn.classList.add("active");
    btn.addEventListener("click", () => onNavigate(tab.id));
    nav.appendChild(btn);
  }

  return nav;
}

// --- Passphrase Modal ---

export function showPassphraseModal(
  title: string,
  onSubmit: (passphrase: string) => void,
  options?: { confirm?: boolean }
): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const h2 = document.createElement("h2");
  h2.textContent = title;
  modal.appendChild(h2);

  const form = document.createElement("form");

  const group1 = document.createElement("div");
  group1.className = "form-group";
  const label1 = document.createElement("label");
  label1.textContent = "Passphrase";
  label1.setAttribute("for", "modal-passphrase");
  const input1 = document.createElement("input");
  input1.type = "password";
  input1.id = "modal-passphrase";
  input1.autocomplete = "off";
  input1.required = true;
  group1.append(label1, input1);
  form.appendChild(group1);

  let input2: HTMLInputElement | null = null;
  if (options?.confirm) {
    const group2 = document.createElement("div");
    group2.className = "form-group";
    const label2 = document.createElement("label");
    label2.textContent = "Confirm passphrase";
    label2.setAttribute("for", "modal-passphrase-confirm");
    input2 = document.createElement("input");
    input2.type = "password";
    input2.id = "modal-passphrase-confirm";
    input2.autocomplete = "off";
    input2.required = true;
    group2.append(label2, input2);
    form.appendChild(group2);
  }

  const errorEl = document.createElement("div");
  errorEl.className = "error";
  errorEl.style.display = "none";
  form.appendChild(errorEl);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn-primary";
  submitBtn.textContent = "Unlock";

  actions.append(cancelBtn, submitBtn);
  form.appendChild(actions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = input1.value;
    if (options?.confirm && input2 && input2.value !== pass) {
      errorEl.textContent = "Passphrases do not match.";
      errorEl.style.display = "block";
      return;
    }
    if (pass.length < 1) return;
    overlay.remove();
    onSubmit(pass);
  });

  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  input1.focus();

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

// --- Confirm Modal ---

export function showConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel?: string
): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const h2 = document.createElement("h2");
  h2.textContent = title;
  modal.appendChild(h2);

  const p = document.createElement("p");
  p.textContent = message;
  p.className = "text-secondary text-sm";
  modal.appendChild(p);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn-danger";
  confirmBtn.textContent = confirmLabel ?? "Delete";
  confirmBtn.addEventListener("click", () => {
    overlay.remove();
    onConfirm();
  });

  actions.append(cancelBtn, confirmBtn);
  modal.appendChild(actions);
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

// --- Toast ---

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, durationMs = 3000): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => toast.remove(), durationMs);
}

// --- Clipboard ---

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
