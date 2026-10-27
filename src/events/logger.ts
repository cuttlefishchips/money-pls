import type { Store } from '../storage';
import { EVENT_VERSION, isValidEvent, type EventType, type ExtrasArgs, type UsageEvent } from './schema';

export interface UsageLogger {
  log<T extends EventType>(type: T, ...extras: ExtrasArgs<T>): Promise<void>;
  logOnce<T extends EventType>(type: T, ...extras: ExtrasArgs<T>): Promise<void>;
}

export class InvalidEventError extends Error {}

export function createUsageLogger(store: Store, code: string, now: () => number = Date.now): UsageLogger {
  async function log(type: EventType, extras: object = {}): Promise<void> {
    const event = { ...extras, v: EVENT_VERSION, code, type, ts: now() };
    if (!isValidEvent(event)) throw new InvalidEventError(`Usage event "${type}" is not on the allowed list`);
    await store.appendUsage(event satisfies UsageEvent);
  }

  return {
    log: (type, ...extras) => log(type, extras[0]),
    async logOnce(type, ...extras) {
      const existing = await store.listUsage();
      if (existing.some((record) => record.type === type)) return;
      await log(type, extras[0]);
    },
  };
}
