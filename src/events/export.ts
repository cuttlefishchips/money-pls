import { isValidEvent, type UsageEvent } from './schema';

export function describeEvent(event: UsageEvent): string {
  switch (event.type) {
    case 'session': {
      const minutes = Math.round(event.duration_s / 60);
      if (minutes < 1) return 'Opened the app, less than a minute';
      return `Opened the app, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
    case 'spend_logged':
      return 'Logged a spend';
    case 'budget_viewed':
      return 'Looked at the daily number';
    case 'start_route':
      return event.route === 'none' ? 'Started not sure yet' : 'Started with goals in mind';
    case 'target_decision':
      return { accepted: 'Priced a goal', adjusted: 'Changed a priced goal', rejected: 'Removed a priced goal' }[event.decision];
    case 'target_set_later':
      return 'Priced a first goal after starting not sure yet';
  }
}

export interface UsageExport {
  events: UsageEvent[];
  skipped: number;
}

export function prepareExport(records: unknown[]): UsageExport {
  const events = records.filter(isValidEvent).sort((a, b) => a.ts - b.ts);
  return { events, skipped: records.length - events.length };
}

export function exportFileName(code: string, date: { year: number; month: number; day: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `usage-${code}-${date.year}-${pad(date.month)}-${pad(date.day)}.json`;
}

export function exportJson(events: UsageEvent[]): string {
  return JSON.stringify(events, null, 2);
}
