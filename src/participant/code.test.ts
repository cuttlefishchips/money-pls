import { describe, expect, it } from 'vitest';
import { createUsageLogger } from '../events/logger';
import { createMemoryStore } from '../storage/memory';
import { CODE_KEY, codeFromHash, normaliseCode, resolveParticipant, switchParticipant } from './code';

describe('codeFromHash', () => {
  it('reads the code from the fragment', () => {
    expect(codeFromHash('#p=P3')).toBe('P3');
    expect(codeFromHash('#p=ORG1')).toBe('ORG1');
    expect(codeFromHash('#x=1&p=P4')).toBe('P4');
  });

  it('treats codes as upper case so p3 and P3 are the same person', () => {
    expect(codeFromHash('#p=p3')).toBe('P3');
  });

  it('ignores a missing, empty or invalid code', () => {
    expect(codeFromHash('')).toBeNull();
    expect(codeFromHash('#')).toBeNull();
    expect(codeFromHash('#p=')).toBeNull();
    expect(codeFromHash('#p=Jane%20Tan')).toBeNull();
    expect(codeFromHash('#p=P3%26amount%3D5')).toBeNull();
  });
});

describe('resolveParticipant', () => {
  it('does not start without a code ever having been stored', async () => {
    expect(await resolveParticipant(createMemoryStore(), '')).toEqual({ kind: 'missing' });
    expect(await resolveParticipant(createMemoryStore(), '#p=not valid')).toEqual({ kind: 'missing' });
  });

  it('stores the code the first time a link is opened', async () => {
    const store = createMemoryStore();
    expect(await resolveParticipant(store, '#p=P3')).toEqual({ kind: 'ready', code: 'P3' });
    expect(await store.getValue(CODE_KEY)).toBe('P3');
  });

  it('starts with the stored code when opened without a fragment, as an installed app is', async () => {
    const store = createMemoryStore();
    await resolveParticipant(store, '#p=P3');
    expect(await resolveParticipant(store, '')).toEqual({ kind: 'ready', code: 'P3' });
  });

  it('keeps the stored code when a link has an invalid code', async () => {
    const store = createMemoryStore();
    await resolveParticipant(store, '#p=P3');
    expect(await resolveParticipant(store, '#p=not valid')).toEqual({ kind: 'ready', code: 'P3' });
  });

  it('starts as normal when the same link is opened again', async () => {
    const store = createMemoryStore();
    await resolveParticipant(store, '#p=P3');
    expect(await resolveParticipant(store, '#p=p3')).toEqual({ kind: 'ready', code: 'P3' });
  });

  it('asks before switching when a link has a different code, and changes nothing until then', async () => {
    const store = createMemoryStore();
    await resolveParticipant(store, '#p=P3');
    expect(await resolveParticipant(store, '#p=P4')).toEqual({ kind: 'confirm-switch', current: 'P3', next: 'P4' });
    expect(await store.getValue(CODE_KEY)).toBe('P3');
  });
});

describe('switchParticipant', () => {
  it('stores the new code once the person agrees', async () => {
    const store = createMemoryStore();
    await resolveParticipant(store, '#p=P3');
    expect(await switchParticipant(store, 'P4')).toEqual({ kind: 'ready', code: 'P4' });
    expect(await resolveParticipant(store, '')).toEqual({ kind: 'ready', code: 'P4' });
  });

  it('refuses an invalid code', async () => {
    await expect(switchParticipant(createMemoryStore(), 'not valid')).rejects.toThrow(RangeError);
  });
});

describe('organiser data', () => {
  it('tags every event from the organiser link with ORG1, so it can be filtered out', async () => {
    const store = createMemoryStore();
    const participant = await resolveParticipant(store, '#p=ORG1');
    if (participant.kind !== 'ready') throw new Error('expected ready');
    const logger = createUsageLogger(store, participant.code);
    await logger.log('spend_logged');
    await logger.log('session', { duration_s: 4 });
    expect((await store.listUsage()).every((e) => e.code === 'ORG1')).toBe(true);
  });
});

describe('normaliseCode', () => {
  it('accepts a typed code with the same rules as the link', () => {
    expect(normaliseCode(' p3 ')).toBe('P3');
    expect(normaliseCode('org1')).toBe('ORG1');
  });

  it('rejects anything else', () => {
    expect(normaliseCode('')).toBeNull();
    expect(normaliseCode('P 3')).toBeNull();
    expect(normaliseCode('A'.repeat(13))).toBeNull();
    expect(normaliseCode(null)).toBeNull();
  });
});
