// src/ui/components.ts

// --- Navigation ---

export type Screen = "home" | "add" | "import-export" | "settings";

export function renderNav(
  active: Screen,
  onNavigate: (screen: Screen) => void
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "nav-wrapper";

  // Top bar
  const header = document.createElement("header");
  header.className = "top-bar";

  const hamburger = document.createElement("button");
  hamburger.className = "hamburger-btn";
  hamburger.setAttribute("aria-label", "Menu");
  hamburger.innerHTML = "<span></span><span></span><span></span>";

  const items: { label: string; screen: Screen }[] = [
    { label: "Accounts", screen: "home" },
    { label: "Add Account", screen: "add" },
    { label: "Import / Export", screen: "import-export" },
    { label: "Settings", screen: "settings" },
  ];

  const title = document.createElement("span");
  title.className = "top-bar-title";
  title.textContent = items.find((i) => i.screen === active)?.label ?? "2fages";

  // Spacer to balance the hamburger button for centering the title
  const spacer = document.createElement("span");
  spacer.className = "hamburger-spacer";
  spacer.style.width = "36px";

  header.append(hamburger, title, spacer);

  // Drawer overlay
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";

  // Drawer
  const drawer = document.createElement("nav");
  drawer.className = "drawer";

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    hamburger.classList.remove("open");
  }

  items.forEach(({ label, screen }) => {
    const link = document.createElement("a");
    link.className = "drawer-link" + (screen === active ? " active" : "");
    link.textContent = label;
    link.href = "#";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      closeDrawer();
      onNavigate(screen);
    });
    drawer.appendChild(link);
  });

  hamburger.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("open");
    if (isOpen) {
      closeDrawer();
    } else {
      drawer.classList.add("open");
      overlay.classList.add("open");
      hamburger.classList.add("open");
    }
  });

  overlay.addEventListener("click", closeDrawer);

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && document.contains(drawer) && drawer.classList.contains("open")) {
      closeDrawer();
    }
  };
  document.addEventListener("keydown", onEscape);

  wrapper.append(header, overlay, drawer);
  return wrapper;
}

// --- Passphrase Modal ---

export function showPassphraseModal(
  title: string,
  onSubmit: (passphrase: string) => void,
  options?: { confirm?: boolean; submitLabel?: string }
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
  submitBtn.textContent = options?.submitLabel ?? title;

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
