import './ui/fonts';
import './ui/tokens.css';
import './ui/app.css';
import { createUsageLogger, trackBudgetViews, trackSessions } from './events';
import { resolveParticipant, switchParticipant, type Participant } from './participant/code';
import { openStore, requestPersistentStorage, type Store } from './storage';
import { renderGate } from './ui/gate';
import { runApp } from './ui/app';

async function start(root: HTMLElement): Promise<void> {
  const store = await openStore();
  show(root, store, await resolveParticipant(store, location.hash));
}

function show(root: HTMLElement, store: Store, participant: Participant): void {
  if (participant.kind !== 'ready') {
    renderGate(root, participant, {
      onSwitch: async (next) => show(root, store, await switchParticipant(store, next)),
      onKeep: (current) => show(root, store, { kind: 'ready', code: current }),
    });
    return;
  }

  void requestPersistentStorage();
  const logger = createUsageLogger(store, participant.code);
  trackSessions(logger, document, window);
  void runApp({ root, store, logger, budgetViews: trackBudgetViews(logger, document), code: participant.code });
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
