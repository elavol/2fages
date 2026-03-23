import * as OTPAuth from "otpauth";
import type { Account } from "./types";
import { getAlgorithm, getDigits, getPeriod } from "./types";

export function generateCode(account: Account): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(account.token),
    algorithm: getAlgorithm(account.algorithm),
    digits: getDigits(account.length),
    period: getPeriod(account.timePeriod),
  });
  const code = totp.generate();
  return account.prefix ? account.prefix + code : code;
}

export function getRemainingSeconds(period: number): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

export interface ParsedOtpauth {
  namespace: string;
  account: Account;
}

export function parseOtpauthUri(uri: string): ParsedOtpauth {
  const parsed = OTPAuth.URI.parse(uri);
  if (!(parsed instanceof OTPAuth.TOTP)) {
    throw new Error("Only TOTP URIs are supported");
  }

  const issuer = parsed.issuer ?? "";
  const label = parsed.label ?? "";

  return {
    namespace: issuer,
    account: {
      name: label,
      token: parsed.secret.base32,
      prefix: "",
      algorithm: parsed.algorithm === "SHA1" ? "" : parsed.algorithm,
      length: parsed.digits === 6 ? 6 : parsed.digits,
      timePeriod: parsed.period === 30 ? 0 : parsed.period,
    },
  };
}
