# 2fages

A PWA for generating TOTP codes, inspired by [totp-cli](https://github.com/yitsushi/totp-cli).

## Why?

Many people use a password manager for both passwords and TOTP codes. But to access the password manager itself, you often need a TOTP code — a chicken-and-egg problem.

2fages solves this by letting you store your most critical TOTP secrets in an [age](https://age-encryption.org/)-encrypted file that can be kept anywhere public — a GitHub Gist, GitLab Snippet, Pastebin, or just a file on your desktop. You access them from any device with a browser.

There are several good free and open source TOTP apps for mobile. But there is no way to verify that the binary on the App Store was built from the code on GitHub. 2fages ships as a single HTML file — what you see in the source is what runs in your browser.

## Features

- **totp-cli compatible** — uses the same credential format and age encryption (scrypt, work factor 15, ASCII-armored)
- **Single HTML file** — all JS/CSS inlined, no external requests after load
- **Never persists plain secrets** — encrypted blob in localStorage, passphrase required every time
- **Import/export** — paste encrypted text, upload `.age` files, or scan QR codes
- **Namespaced accounts** — organize TOTP entries by service, just like totp-cli
- **Mobile-friendly** — responsive design, works on any device with a modern browser
- **Offline capable** — works without internet after initial load
- **Dark mode** — respects system `prefers-color-scheme`

## Usage

Open the hosted app or download `index.html` and open it in your browser.

### First time

1. Click **Create New Vault** and set a strong passphrase
2. Add accounts manually or scan QR codes
3. Export your encrypted credentials and store them somewhere safe

### Importing existing totp-cli credentials

1. Copy your totp-cli credential file content (it's already age-encrypted)
2. Go to **Import/Export** and paste it in
3. Your namespaces and accounts will appear on the home screen

### Generating a code

1. Tap an account on the home screen
2. Enter your passphrase
3. The TOTP code appears and is copied to your clipboard
4. The code auto-clears after one time period

## Security Model

- Credentials are encrypted with [age](https://age-encryption.org/) using scrypt passphrase encryption (work factor 15)
- The encrypted file is standard age format — you can decrypt it with `age -d` on the command line
- Plain secrets exist only in JavaScript memory during code generation, never in the DOM or storage
- Clipboard auto-clears after the code expires
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
- [otpauth](https://github.com/nicedoc/otpauth) — TOTP generation
- [html5-qrcode](https://github.com/nicedoc/html5-qrcode) — camera QR scanning
- [Vite](https://vitejs.dev/) + [vite-plugin-singlefile](https://github.com/nicedoc/vite-plugin-singlefile) — build into single HTML

## License

MIT
