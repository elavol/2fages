// src/qr.ts
import { Html5Qrcode } from "html5-qrcode";

let scanner: Html5Qrcode | null = null;

export async function startScanner(
  elementId: string,
  onResult: (decodedText: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    scanner = new Html5Qrcode(elementId);
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        stopScanner();
        onResult(decodedText);
      },
      () => {
        // Ignore per-frame decode failures
      }
    );
  } catch (err) {
    const msg = String(err);
    if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
      onError(
        "Camera permission denied. Please allow camera access in your browser settings and try again."
      );
    } else if (msg.includes("NotFoundError")) {
      onError("No camera found on this device.");
    } else {
      onError("Failed to start camera: " + msg);
    }
  }
}

export async function stopScanner(): Promise<void> {
  if (scanner) {
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Ignore errors during cleanup
    }
    scanner = null;
  }
}
