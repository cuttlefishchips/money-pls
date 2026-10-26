import { describe, expect, it } from 'vitest';
import { CODE_KEY } from '../participant/code';
import { createMemoryStore } from '../storage/memory';
import { startOver } from './start-over';
import { APP_KEY } from './state';

describe('startOver', () => {
  it('clears the plan and spends but keeps the participant code and usage log', async () => {
    const store = createMemoryStore();
    await store.setValue(CODE_KEY, 'P3');
    await store.setValue(APP_KEY, { step: 'today' });
    await store.setValue('plan', { old: true });
    await store.setValue('spendsChangedAt', 123);
    await store.putSpend({ id: 'a', owner: 'me', amountCents: 500, date: '2026-10-21', loggedAt: 1 });
    await store.appendUsage({ v: 1, code: 'P3', type: 'spend_logged', ts: 1 });

    await startOver(store);

    expect(await store.getValue(APP_KEY)).toBeUndefined();
    expect(await store.getValue('plan')).toBeUndefined();
    expect(await store.getValue('spendsChangedAt')).toBeUndefined();
    expect(await store.listSpends()).toEqual([]);
    expect(await store.getValue(CODE_KEY)).toBe('P3');
    expect(await store.listUsage()).toHaveLength(1);
  });
});
