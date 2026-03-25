# 2fages

TOTP code generator PWA inspired by [totp-cli](https://github.com/yitsushi/totp-cli). Stores credentials encrypted with `age` so they can be kept anywhere public.

## Quick Reference

- **Output:** Single HTML file at `dist/index.html`
- **Stack:** Vanilla TypeScript, Vite, no framework
- **Encryption:** `age-encryption` (typage) — scrypt passphrase, work factor 15, ASCII-armored
- **Credential format:** totp-cli V2 compatible (JSON array of namespaces/accounts)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build single HTML file to dist/
npm run preview      # Preview production build
```

## Architecture

Single-page app with DOM-based screen swapping. No framework, no router library.

```
src/
  index.html          # HTML shell
  main.ts             # Entry point, router, DOM management, auto-lock timer
  crypto.ts            # age encrypt/decrypt via age-encryption
  totp.ts             # TOTP generation via otpauth
  storage.ts          # localStorage read/write of encrypted blob
  qr.ts               # QR scanning via html5-qrcode
  ui/
    home.ts           # Vault list screen
    add.ts            # Add account screen
    import-export.ts  # Import/export screen
    settings.ts       # Settings screen
    components.ts     # Shared UI helpers (nav, modals, toasts)
  styles.css          # All styles, responsive/mobile-first
```

## Key Dependencies

- `age-encryption` — age encrypt/decrypt (npm package for typage)
- `otpauth` — TOTP code generation
- `html5-qrcode` — camera QR scanning
- `vite-plugin-singlefile` — inline all assets into one HTML

## Design Principles

- **Never persist plain secrets.** Encrypted blob in localStorage only. Passphrase required every time.
- **totp-cli compatibility.** Same JSON structure, same age encryption, same scrypt work factor.
- **Single file output.** Everything inlined — JS, CSS, manifest. No service worker.
- **Mobile-first.** Responsive, touch-friendly, supports `prefers-color-scheme`.
- **Minimal dependencies.** No framework, no unnecessary abstractions.

## Credential Format (totp-cli V2)

```json
[
  {
    "name": "namespace",
    "accounts": [
      {
        "name": "account",
        "token": "BASE32SECRET",
        "prefix": "",
        "algorithm": "",
        "length": 6,
        "timePeriod": 0
      }
    ]
  }
]
```

Defaults: `algorithm` = SHA1, `length` = 6, `timePeriod` 0 means 30s.

## Encryption Flow

```
Encrypt: JSON string → age-encryption Encrypter (scrypt, work factor 15) → armor.encode() → ASCII-armored string
Decrypt: ASCII-armored string → armor.decode() → Decrypter (passphrase) → JSON string
```

## Security Rules

- Decrypted secrets in JS memory only — never DOM, never storage
- Auto-lock after 15 min inactivity — `cachedVault` flushed, UI re-locks (see `main.ts`)
- Passphrase inputs use `type="password"`
- No analytics, no telemetry, no network calls after load
