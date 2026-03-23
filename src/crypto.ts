import { Encrypter, Decrypter, armor } from "age-encryption";
import type { Vault } from "./types";

const SCRYPT_WORK_FACTOR = 15;

export async function encrypt(
  vault: Vault,
  passphrase: string
): Promise<string> {
  const e = new Encrypter();
  e.setPassphrase(passphrase);
  e.setScryptWorkFactor(SCRYPT_WORK_FACTOR);
  const plaintext = JSON.stringify(vault);
  const ciphertext = await e.encrypt(plaintext);
  return armor.encode(ciphertext);
}

export async function decrypt(
  armoredCiphertext: string,
  passphrase: string
): Promise<Vault> {
  const d = new Decrypter();
  d.addPassphrase(passphrase);
  const ciphertext = armor.decode(armoredCiphertext);
  const plaintext = await d.decrypt(ciphertext, "text");
  return JSON.parse(plaintext) as Vault;
}
