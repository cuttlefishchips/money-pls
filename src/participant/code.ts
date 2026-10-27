import { isValidCode } from '../events/schema';
import type { Store } from '../storage';

export const CODE_KEY = 'participantCode';

export type Participant =
  | { kind: 'ready'; code: string }
  | { kind: 'missing' }
  | { kind: 'confirm-switch'; current: string; next: string };

export function normaliseCode(text: string | null | undefined): string | null {
  const code = text?.trim().toUpperCase();
  return code && isValidCode(code) ? code : null;
}

export function codeFromHash(hash: string): string | null {
  return normaliseCode(new URLSearchParams(hash.replace(/^#/, '')).get('p'));
}

export async function resolveParticipant(store: Store, hash: string): Promise<Participant> {
  const stored = await store.getValue<string>(CODE_KEY);
  const fromLink = codeFromHash(hash);

  if (fromLink && !stored) {
    await store.setValue(CODE_KEY, fromLink);
    return { kind: 'ready', code: fromLink };
  }
  if (fromLink && stored && fromLink !== stored) {
    return { kind: 'confirm-switch', current: stored, next: fromLink };
  }
  return stored ? { kind: 'ready', code: stored } : { kind: 'missing' };
}

export async function switchParticipant(store: Store, next: string): Promise<Participant> {
  if (!isValidCode(next)) throw new RangeError('Not a valid participant code');
  await store.setValue(CODE_KEY, next);
  return { kind: 'ready', code: next };
}
