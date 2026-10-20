import type { UsageLogger } from './logger';

export interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface PageHideSource {
  addEventListener(type: 'pagehide', listener: () => void): void;
}

export function trackSessions(
  logger: UsageLogger,
  doc: VisibilitySource,
  win: PageHideSource,
  now: () => number = Date.now,
): void {
  let startedAt: number | null = doc.visibilityState === 'visible' ? now() : null;

  const end = () => {
    if (startedAt === null) return;
    const duration_s = Math.max(0, Math.round((now() - startedAt) / 1000));
    startedAt = null;
    void logger.log('session', { duration_s });
  };

  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') end();
    else if (startedAt === null) startedAt = now();
  });
  win.addEventListener('pagehide', end);
}

export interface BudgetViewTracker {
  enter(): void;
  leave(): void;
}

export function trackBudgetViews(logger: UsageLogger, doc: VisibilitySource): BudgetViewTracker {
  let onScreen = false;
  let loggedThisVisit = false;

  const logView = () => {
    if (loggedThisVisit || doc.visibilityState !== 'visible') return;
    loggedThisVisit = true;
    void logger.log('budget_viewed');
  };

  doc.addEventListener('visibilitychange', () => {
    if (!onScreen) return;
    if (doc.visibilityState === 'hidden') loggedThisVisit = false;
    else logView();
  });

  return {
    enter() {
      if (onScreen) return;
      onScreen = true;
      loggedThisVisit = false;
      logView();
    },
    leave() {
      onScreen = false;
    },
  };
}
