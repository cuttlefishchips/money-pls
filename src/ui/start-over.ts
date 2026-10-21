import type { Store } from '../storage';
import { APP_KEY } from './state';

const LEGACY_KEYS = ['plan'];

export async function startOver(store: Store): Promise<void> {
  await store.deleteValue(APP_KEY);
  for (const key of LEGACY_KEYS) await store.deleteValue(key);
  for (const spend of await store.listSpends()) await store.deleteSpend(spend.id);
}
