import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/memory';
import { createUsageLogger, InvalidEventError } from './logger';

describe('createUsageLogger', () => {
  it('stores events with version, code, type and time, plus only the allowed fields', async () => {
    const store = createMemoryStore();
    const logger = createUsageLogger(store, 'P3', () => 1000);
    await logger.log('spend_logged');
    await logger.log('start_route', { route: 'one' });
    expect(await store.listUsage()).toEqual([
      { v: 1, code: 'P3', type: 'spend_logged', ts: 1000 },
      { v: 1, code: 'P3', type: 'start_route', route: 'one', ts: 1000 },
    ]);
  });

  it('refuses and does not store an event with a field off the list', async () => {
    const store = createMemoryStore();
    const logger = createUsageLogger(store, 'P3');
    const unsafe = logger.log as unknown as (type: string, extras: object) => Promise<void>;
    await expect(unsafe('spend_logged', { amountCents: 500 })).rejects.toThrow(InvalidEventError);
    await expect(unsafe('screen_viewed', {})).rejects.toThrow(InvalidEventError);
    expect(await store.listUsage()).toEqual([]);
  });

  it('cannot be made to overwrite the version, code or time', async () => {
    const store = createMemoryStore();
    const logger = createUsageLogger(store, 'P3', () => 5);
    const unsafe = logger.log as unknown as (type: string, extras: object) => Promise<void>;
    await unsafe('session', { duration_s: 3, v: 9, code: 'X', ts: 0 });
    expect(await store.listUsage()).toEqual([{ v: 1, code: 'P3', type: 'session', duration_s: 3, ts: 5 }]);
  });

  it('refuses to log under an invalid code', async () => {
    const logger = createUsageLogger(createMemoryStore(), 'not a code');
    await expect(logger.log('spend_logged')).rejects.toThrow(InvalidEventError);
  });

  it('logs a once-only event a single time', async () => {
    const store = createMemoryStore();
    const logger = createUsageLogger(store, 'P3');
    await logger.logOnce('start_route', { route: 'areas' });
    await logger.logOnce('start_route', { route: 'none' });
    expect((await store.listUsage()).map((e) => e.route)).toEqual(['areas']);
  });
});

describe('UsageLogger types', () => {
  it('reject disallowed fields at compile time', () => {
    const logger = createUsageLogger(createMemoryStore(), 'P3');
    const typeChecksOnly = () => {
      // @ts-expect-error amounts are never allowed
      void logger.log('spend_logged', { amountCents: 500 });
      // @ts-expect-error start_route needs a route
      void logger.log('start_route');
      // @ts-expect-error only the listed routes are allowed
      void logger.log('start_route', { route: 'other' });
      // @ts-expect-error unknown event types are not allowed
      void logger.log('screen_viewed');
    };
    expect(typeChecksOnly).toBeTypeOf('function');
  });
});
