import { describe, expect, it } from 'vitest';
import { describeEvent, exportFileName, exportJson, prepareExport } from './export';
import type { UsageEvent } from './schema';

const base = { v: 1 as const, code: 'P3', ts: 1_000 };

describe('describeEvent', () => {
  it.each<[UsageEvent, string]>([
    [{ ...base, type: 'session', duration_s: 180 }, 'Opened the app, 3 minutes'],
    [{ ...base, type: 'session', duration_s: 60 }, 'Opened the app, 1 minute'],
    [{ ...base, type: 'session', duration_s: 20 }, 'Opened the app, less than a minute'],
    [{ ...base, type: 'spend_logged' }, 'Logged a spend'],
    [{ ...base, type: 'budget_viewed' }, 'Looked at the daily number'],
    [{ ...base, type: 'start_route', route: 'items', entry: 'pay' }, 'Picked what to save for, started with pay'],
    [{ ...base, type: 'start_route', route: 'none', entry: 'budget' }, 'Chose not now for goals, started with a monthly budget'],
    [{ ...base, type: 'target_decision', decision: 'accepted' }, 'Priced a goal'],
    [{ ...base, type: 'target_decision', decision: 'adjusted' }, 'Changed a priced goal'],
    [{ ...base, type: 'target_decision', decision: 'rejected' }, 'Removed a priced goal'],
    [{ ...base, type: 'target_set_later' }, 'Priced a first goal after starting not sure yet'],
  ])('describes %o as %j', (event, words) => {
    expect(describeEvent(event)).toBe(words);
  });

  it('never mentions money', () => {
    const words = [
      describeEvent({ ...base, type: 'spend_logged' }),
      describeEvent({ ...base, type: 'target_decision', decision: 'accepted' }),
    ].join(' ');
    expect(words).not.toMatch(/\$|\d/);
  });
});

describe('prepareExport', () => {
  it('keeps only events on the allowed list, oldest first, and counts the rest', () => {
    const records = [
      { ...base, type: 'spend_logged', ts: 3 },
      { ...base, type: 'budget_viewed', ts: 1 },
      { ...base, type: 'spend_logged', ts: 2, amountCents: 500 },
      { ...base, type: 'start_route', route: 'areas', ts: 4 },
    ];
    const prepared = prepareExport(records);
    expect(prepared.events.map((e) => e.ts)).toEqual([1, 3]);
    expect(prepared.skipped).toBe(2);
  });

  it('upgrades a start_route logged before entry existed to entry pay, the only entry then', () => {
    const prepared = prepareExport([{ ...base, type: 'start_route', route: 'none' }]);
    expect(prepared.events).toEqual([{ ...base, type: 'start_route', route: 'none', entry: 'pay' }]);
    expect(prepared.skipped).toBe(0);
  });

  it('exports no amounts or notes even if one was stored by mistake', () => {
    const json = exportJson(prepareExport([{ ...base, type: 'spend_logged', note: 'white beehoon' }]).events);
    expect(json).toBe('[]');
  });
});

describe('exportFileName', () => {
  it('is usage-<code>-<date>.json', () => {
    expect(exportFileName('ORG1', { year: 2026, month: 11, day: 3 })).toBe('usage-ORG1-2026-11-03.json');
  });
});

describe('exportJson', () => {
  it('writes the events as a plain JSON array', () => {
    const events: UsageEvent[] = [{ ...base, type: 'session', duration_s: 5 }];
    expect(JSON.parse(exportJson(events))).toEqual(events);
  });
});
