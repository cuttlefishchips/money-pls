import { describe, expect, it } from 'vitest';
import type { UsageLogger } from './logger';
import { trackBudgetViews, trackSessions } from './trackers';

function fakePage(initial: DocumentVisibilityState = 'visible') {
  const listeners: Record<string, (() => void)[]> = {};
  const doc = {
    visibilityState: initial,
    addEventListener(type: string, fn: () => void) {
      (listeners[type] ??= []).push(fn);
    },
  };
  const fire = (type: string) => listeners[type]?.forEach((fn) => fn());
  return {
    doc,
    win: doc,
    hide() {
      doc.visibilityState = 'hidden';
      fire('visibilitychange');
    },
    show() {
      doc.visibilityState = 'visible';
      fire('visibilitychange');
    },
    close: () => fire('pagehide'),
  };
}

function recordingLogger() {
  const logged: { type: string; extras?: object }[] = [];
  const logger = {
    log: async (type: string, extras?: object) => {
      logged.push(extras ? { type, extras } : { type });
    },
    logOnce: async () => {},
  } as unknown as UsageLogger;
  return { logger, logged };
}

describe('trackSessions', () => {
  it('logs the session length in whole seconds when the page is hidden', () => {
    let time = 0;
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    trackSessions(logger, page.doc, page.win, () => time);
    time = 95_400;
    page.hide();
    expect(logged).toEqual([{ type: 'session', extras: { duration_s: 95 } }]);
  });

  it('starts a new session when the page comes back', () => {
    let time = 0;
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    trackSessions(logger, page.doc, page.win, () => time);
    time = 10_000;
    page.hide();
    time = 500_000;
    page.show();
    time = 530_000;
    page.hide();
    expect(logged.map((l) => l.extras)).toEqual([{ duration_s: 10 }, { duration_s: 30 }]);
  });

  it('logs once when the page is hidden and then closed', () => {
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    trackSessions(logger, page.doc, page.win, () => 0);
    page.hide();
    page.close();
    expect(logged).toHaveLength(1);
  });

  it('logs on close when the page was not hidden first', () => {
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    trackSessions(logger, page.doc, page.win, () => 0);
    page.close();
    expect(logged).toHaveLength(1);
  });

  it('does not start a session while the page loads hidden', () => {
    let time = 0;
    const page = fakePage('hidden');
    const { logger, logged } = recordingLogger();
    trackSessions(logger, page.doc, page.win, () => time);
    page.close();
    expect(logged).toEqual([]);
    time = 1_000;
    page.show();
    time = 4_000;
    page.hide();
    expect(logged).toEqual([{ type: 'session', extras: { duration_s: 3 } }]);
  });
});

describe('trackBudgetViews', () => {
  it('logs once per screen visit', () => {
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    const views = trackBudgetViews(logger, page.doc);
    views.enter();
    views.enter();
    views.leave();
    views.enter();
    expect(logged).toEqual([{ type: 'budget_viewed' }, { type: 'budget_viewed' }]);
  });

  it('logs again when the app returns to the foreground on that screen', () => {
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    const views = trackBudgetViews(logger, page.doc);
    views.enter();
    page.hide();
    page.show();
    expect(logged).toHaveLength(2);
  });

  it('does not log on return to the foreground on another screen', () => {
    const page = fakePage();
    const { logger, logged } = recordingLogger();
    const views = trackBudgetViews(logger, page.doc);
    views.enter();
    views.leave();
    page.hide();
    page.show();
    expect(logged).toHaveLength(1);
  });

  it('waits until the page is visible before logging', () => {
    const page = fakePage('hidden');
    const { logger, logged } = recordingLogger();
    const views = trackBudgetViews(logger, page.doc);
    views.enter();
    expect(logged).toHaveLength(0);
    page.show();
    expect(logged).toHaveLength(1);
  });
});
