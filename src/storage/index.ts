import { openIndexedDbStore } from './indexeddb';
import type { Store } from './types';

export * from './types';

export function openStore(): Promise<Store> {
  return openIndexedDbStore();
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
