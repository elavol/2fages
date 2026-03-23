import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../src/crypto";

const TEST_PASSPHRASE = "test-passphrase-2fages";
const TEST_DATA: import("../src/types").Vault = [
  {
    name: "test-ns",
    accounts: [
      {
        name: "test-account",
        token: "JBSWY3DPEHPK3PXP",
        prefix: "",
        algorithm: "",
        length: 6,
        timePeriod: 0,
      },
    ],
  },
];

describe("crypto", () => {
  it("encrypts and decrypts vault data roundtrip", async () => {
    const encrypted = await encrypt(TEST_DATA, TEST_PASSPHRASE);
    expect(encrypted).toContain("-----BEGIN AGE ENCRYPTED FILE-----");
    expect(encrypted).toContain("-----END AGE ENCRYPTED FILE-----");

    const decrypted = await decrypt(encrypted, TEST_PASSPHRASE);
    expect(decrypted).toEqual(TEST_DATA);
  });

  it("fails to decrypt with wrong passphrase", async () => {
    const encrypted = await encrypt(TEST_DATA, TEST_PASSPHRASE);
    await expect(decrypt(encrypted, "wrong-password")).rejects.toThrow();
  });

  it("produces different ciphertext each time", async () => {
    const a = await encrypt(TEST_DATA, TEST_PASSPHRASE);
    const b = await encrypt(TEST_DATA, TEST_PASSPHRASE);
    expect(a).not.toBe(b);
  });
});
