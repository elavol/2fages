export interface Account {
  name: string;
  token: string;
  prefix: string;
  algorithm: string;
  length: number;
  timePeriod: number;
}

export interface Namespace {
  name: string;
  accounts: Account[];
}

export type Vault = Namespace[];

export function getAlgorithm(raw: string): "SHA1" | "SHA256" | "SHA512" {
  const upper = raw.toUpperCase();
  if (upper === "SHA256") return "SHA256";
  if (upper === "SHA512") return "SHA512";
  return "SHA1";
}

export function getDigits(raw: number): number {
  return raw > 0 ? raw : 6;
}

export function getPeriod(raw: number): number {
  return raw > 0 ? raw : 30;
}

export function createEmptyAccount(
  name: string,
  token: string,
  namespace?: string
): { namespace: string; account: Account } {
  return {
    namespace: namespace ?? "",
    account: {
      name,
      token,
      prefix: "",
      algorithm: "",
      length: 6,
      timePeriod: 0,
    },
  };
}
