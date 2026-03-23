import { describe, it, expect } from "vitest";
import { generateCode, parseOtpauthUri, getRemainingSeconds } from "../src/totp";
import type { Account } from "../src/types";

describe("generateCode", () => {
  it("generates a 6-digit code for a known secret", () => {
    const account: Account = {
      name: "test",
      token: "JBSWY3DPEHPK3PXP",
      prefix: "",
      algorithm: "",
      length: 6,
      timePeriod: 0,
    };
    const code = generateCode(account);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates an 8-digit code when length is 8", () => {
    const account: Account = {
      name: "test",
      token: "JBSWY3DPEHPK3PXP",
      prefix: "",
      algorithm: "",
      length: 8,
      timePeriod: 0,
    };
    const code = generateCode(account);
    expect(code).toMatch(/^\d{8}$/);
  });

  it("prepends prefix when present", () => {
    const account: Account = {
      name: "test",
      token: "JBSWY3DPEHPK3PXP",
      prefix: "PRE-",
      algorithm: "",
      length: 6,
      timePeriod: 0,
    };
    const code = generateCode(account);
    expect(code).toMatch(/^PRE-\d{6}$/);
  });
});

describe("parseOtpauthUri", () => {
  it("parses a standard otpauth URI", () => {
    const uri =
      "otpauth://totp/ACME:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME&algorithm=SHA1&digits=6&period=30";
    const result = parseOtpauthUri(uri);
    expect(result.namespace).toBe("ACME");
    expect(result.account.name).toBe("user@example.com");
    expect(result.account.token).toBe("JBSWY3DPEHPK3PXP");
  });

  it("parses URI without issuer prefix", () => {
    const uri =
      "otpauth://totp/myaccount?secret=JBSWY3DPEHPK3PXP";
    const result = parseOtpauthUri(uri);
    expect(result.namespace).toBe("");
    expect(result.account.name).toBe("myaccount");
  });
});

describe("getRemainingSeconds", () => {
  it("returns a number between 1 and period", () => {
    const remaining = getRemainingSeconds(30);
    expect(remaining).toBeGreaterThanOrEqual(1);
    expect(remaining).toBeLessThanOrEqual(30);
  });
});
