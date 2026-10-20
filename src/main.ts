import './ui/fonts';
import './ui/tokens.css';
import { createUsageLogger, trackSessions } from './events';
import { resolveParticipant, switchParticipant, type Participant } from './participant/code';
import { openStore, requestPersistentStorage, type Store } from './storage';
import { renderGate } from './ui/gate';

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
  trackSessions(createUsageLogger(store, participant.code), document, window);
  root.textContent = `Money Pls is set up for ${participant.code}.`;
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
