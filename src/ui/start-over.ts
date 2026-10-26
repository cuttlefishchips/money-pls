import type { Store } from '../storage';
import { SPENDS_CHANGED_KEY } from './spends';
import { APP_KEY } from './state';

const OTHER_KEYS = ['plan', SPENDS_CHANGED_KEY];

export async function startOver(store: Store): Promise<void> {
  await store.deleteValue(APP_KEY);
  for (const key of OTHER_KEYS) await store.deleteValue(key);
  for (const spend of await store.listSpends()) await store.deleteSpend(spend.id);
}
