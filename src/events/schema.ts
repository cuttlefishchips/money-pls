export const EVENT_VERSION = 1;

export const ROUTES = ['areas', 'one', 'none'] as const;
export const DECISIONS = ['accepted', 'adjusted', 'rejected'] as const;

export type Route = (typeof ROUTES)[number];
export type Decision = (typeof DECISIONS)[number];

export interface EventExtras {
  session: { duration_s: number };
  spend_logged: Record<string, never>;
  budget_viewed: Record<string, never>;
  start_route: { route: Route };
  target_decision: { decision: Decision };
  target_set_later: Record<string, never>;
}

export type EventType = keyof EventExtras;

export type UsageEvent = {
  [T in EventType]: { v: typeof EVENT_VERSION; code: string; type: T; ts: number } & EventExtras[T];
}[EventType];

type FieldCheck = (value: unknown) => boolean;

const isWholeNonNegative: FieldCheck = (value) => Number.isSafeInteger(value) && (value as number) >= 0;
const oneOf =
  (allowed: readonly string[]): FieldCheck =>
  (value) =>
    typeof value === 'string' && allowed.includes(value);

const EXTRA_FIELDS: { [T in EventType]: Record<string, FieldCheck> } = {
  session: { duration_s: isWholeNonNegative },
  spend_logged: {},
  budget_viewed: {},
  start_route: { route: oneOf(ROUTES) },
  target_decision: { decision: oneOf(DECISIONS) },
  target_set_later: {},
};

export const EVENT_TYPES = Object.keys(EXTRA_FIELDS) as EventType[];

const CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export function isValidCode(code: unknown): code is string {
  return typeof code === 'string' && CODE_PATTERN.test(code);
}

export function isValidEvent(record: unknown): record is UsageEvent {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return false;
  const r = record as Record<string, unknown>;
  if (r.v !== EVENT_VERSION || !isValidCode(r.code) || !isWholeNonNegative(r.ts)) return false;
  if (typeof r.type !== 'string' || !Object.hasOwn(EXTRA_FIELDS, r.type)) return false;

  const extras = EXTRA_FIELDS[r.type as EventType];
  const allowedKeys = new Set(['v', 'code', 'type', 'ts', ...Object.keys(extras)]);
  const keys = Object.keys(r);
  if (keys.length !== allowedKeys.size || keys.some((k) => !allowedKeys.has(k))) return false;
  return Object.entries(extras).every(([key, check]) => check(r[key]));
}
