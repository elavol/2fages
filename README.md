# 2fages

A single-HTML-file TOTP code generator, inspired by [totp-cli](https://github.com/yitsushi/totp-cli).

## Why?

Many people use a password manager for both passwords and TOTP codes. But to access the password manager itself, you often need a TOTP code — a chicken-and-egg problem. It's always good practice to have more than one way in — recovery codes, backup apps, or recovery contacts.

2fages is one more option: store your most critical TOTP secrets in an [age](https://age-encryption.org/)-encrypted file that can be kept anywhere public — a GitHub Gist, GitLab Snippet, Pastebin, or just a file on your desktop — and open them from any device with a browser. The entire app is a single HTML file you can audit and host yourself.

## Features

- **totp-cli compatible** — uses the same credential format and age encryption (scrypt, work factor 15, ASCII-armored)
- **Single HTML file** — all JS/CSS inlined, no external requests after load
- **Never persists plain secrets** — encrypted blob in localStorage, passphrase required every time
- **Import/export** — paste encrypted text, upload `.age` files, or scan QR codes
- **Auto-lock** — vault locks automatically after 15 minutes of inactivity, flushing decrypted secrets from memory
- **Manual lock** — lock the vault instantly with one tap after use
- **Inline codes** — all TOTP codes visible at once with live countdown timers after unlock
- **Mobile-friendly** — responsive design, works on any device with a modern browser
- **Offline capable** — works without internet after initial load
- **Dark mode** — respects system `prefers-color-scheme`

## Usage

Open the hosted app at **[2fages.elavol.com](https://2fages.elavol.com)** or download `dist/index.html` and open it in your browser.

### First time

1. Click **Create New Vault** and set a strong passphrase
2. Add accounts manually or scan QR codes
3. Export your encrypted credentials and store them somewhere safe

### Importing existing totp-cli credentials

1. Copy your totp-cli credential file content (it's already age-encrypted)
2. Go to **Import/Export** and paste it in
3. Your accounts will appear on the home screen as `namespace/account`

### Generating a code

1. Enter your passphrase to unlock the vault
2. All TOTP codes appear inline with countdown timers
3. Tap any code to copy it to your clipboard

## Security Model

- Credentials are encrypted with [age](https://age-encryption.org/) using scrypt passphrase encryption (work factor 15)
- The encrypted file is standard age format — you can decrypt it with `age -d` on the command line
- Plain secrets exist only in JavaScript memory during code generation, never in the DOM or storage
- Vault auto-locks after 15 minutes of inactivity, or can be locked manually at any time — both clear decrypted data from memory
- No analytics, no telemetry, no network calls after the page loads
- The entire app is a single HTML file you can audit

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build to dist/index.html
npm run preview      # Preview production build
```

### Tech Stack

- Vanilla TypeScript — no framework
- [age-encryption](https://github.com/FiloSottile/typage) (typage) — age encrypt/decrypt
- [otpauth](https://github.com/hectorm/otpauth) — TOTP generation
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — camera QR scanning
- [Vite](https://vitejs.dev/) + [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) — build into single HTML

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

MIT
