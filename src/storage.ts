const STORAGE_KEY = "2fages_vault";

export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function saveEncrypted(
  data: string,
  storage: Storage = localStorage
): void {
  storage.setItem(STORAGE_KEY, data);
}

export function loadEncrypted(
  storage: Storage = localStorage
): string | null {
  return storage.getItem(STORAGE_KEY);
}

export function clearStorage(
  storage: Storage = localStorage
): void {
  storage.removeItem(STORAGE_KEY);
}
