import { describe, it, expect, beforeEach } from "vitest";
import { saveEncrypted, loadEncrypted, clearStorage } from "../src/storage";

// Mock localStorage for Node test environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
} as unknown as Storage;

describe("storage", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("saves and loads encrypted data", () => {
    const data = "-----BEGIN AGE ENCRYPTED FILE-----\ntest\n-----END AGE ENCRYPTED FILE-----";
    saveEncrypted(data, fakeLocalStorage);
    expect(loadEncrypted(fakeLocalStorage)).toBe(data);
  });

  it("returns null when no data stored", () => {
    expect(loadEncrypted(fakeLocalStorage)).toBeNull();
  });

  it("clears stored data", () => {
    saveEncrypted("test-data", fakeLocalStorage);
    clearStorage(fakeLocalStorage);
    expect(loadEncrypted(fakeLocalStorage)).toBeNull();
  });
});
