import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { openIndexedDbStore } from './indexeddb';
import { createMemoryStore } from './memory';
import { DEFAULT_OWNER, type Spend, type Store } from './types';

const spend = (id: string, date: string, loggedAt: number, amountCents = 500): Spend => ({
  id,
  owner: DEFAULT_OWNER,
  amountCents,
  date,
  loggedAt,
});

const implementations: [string, () => Promise<Store>][] = [
  ['memory', async () => createMemoryStore()],
  ['IndexedDB', () => openIndexedDbStore('test', new IDBFactory())],
];

describe.each(implementations)('%s store', (_name, open) => {
  it('returns undefined for a value never set', async () => {
    const store = await open();
    expect(await store.getValue('setup')).toBeUndefined();
  });

  it('saves and replaces values by key', async () => {
    const store = await open();
    await store.setValue('setup', { step: 2, route: 'areas' });
    expect(await store.getValue('setup')).toEqual({ step: 2, route: 'areas' });
    await store.setValue('setup', { step: 3 });
    expect(await store.getValue('setup')).toEqual({ step: 3 });
  });

  it('returns copies, so changing a result does not change what is stored', async () => {
    const store = await open();
    await store.setValue('setup', { step: 1 });
    const value = await store.getValue<{ step: number }>('setup');
    value!.step = 9;
    expect(await store.getValue('setup')).toEqual({ step: 1 });
  });

  it('adds, edits and deletes spends', async () => {
    const store = await open();
    await store.putSpend(spend('a', '2026-10-20', 1));
    await store.putSpend(spend('b', '2026-10-21', 2));
    await store.putSpend({ ...spend('a', '2026-10-20', 1), amountCents: 750 });
    await store.deleteSpend('b');
    expect(await store.listSpends()).toEqual([{ ...spend('a', '2026-10-20', 1), amountCents: 750 }]);
  });

  it('keeps the owner on every spend', async () => {
    const store = await open();
    await store.putSpend(spend('a', '2026-10-20', 1));
    expect((await store.listSpends())[0]?.owner).toBe('me');
  });

  it('lists spends by date, then by when they were logged', async () => {
    const store = await open();
    await store.putSpend(spend('late', '2026-10-21', 1));
    await store.putSpend(spend('second', '2026-10-20', 3));
    await store.putSpend(spend('first', '2026-10-20', 2));
    expect((await store.listSpends()).map((s) => s.id)).toEqual(['first', 'second', 'late']);
  });

  it('ignores deleting a spend that does not exist', async () => {
    const store = await open();
    await expect(store.deleteSpend('missing')).resolves.toBeUndefined();
  });

  it('keeps usage records apart from spends, in the order they were added', async () => {
    const store = await open();
    await store.putSpend(spend('a', '2026-10-20', 1));
    await store.appendUsage({ v: 1, code: 'P3', type: 'spend_logged', ts: 1 });
    await store.appendUsage({ v: 1, code: 'P3', type: 'budget_viewed', ts: 2 });
    expect(await store.listUsage()).toEqual([
      { v: 1, code: 'P3', type: 'spend_logged', ts: 1 },
      { v: 1, code: 'P3', type: 'budget_viewed', ts: 2 },
    ]);
  });
});

describe('IndexedDB store', () => {
  it('keeps data when the database is opened again', async () => {
    const factory = new IDBFactory();
    const first = await openIndexedDbStore('reopen', factory);
    await first.setValue('code', 'P3');
    await first.putSpend(spend('a', '2026-10-20', 1));
    const second = await openIndexedDbStore('reopen', factory);
    expect(await second.getValue('code')).toBe('P3');
    expect(await second.listSpends()).toHaveLength(1);
  });
});
