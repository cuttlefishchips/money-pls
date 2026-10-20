import type { Participant } from '../participant/code';

export interface GateActions {
  onSwitch(next: string): void;
  onKeep(current: string): void;
}

export function renderGate(root: HTMLElement, participant: Exclude<Participant, { kind: 'ready' }>, actions: GateActions): void {
  root.replaceChildren();

  if (participant.kind === 'missing') {
    root.append(
      el('h1', 'Money Pls'),
      el('p', 'Please open Money Pls from the personal link you were sent. The link tells the app which participant you are.'),
    );
    return;
  }

  const { current, next } = participant;
  const switchButton = el('button', `Switch to ${next}`);
  const keepButton = el('button', `Keep ${current}`);
  switchButton.addEventListener('click', () => actions.onSwitch(next));
  keepButton.addEventListener('click', () => actions.onKeep(current));
  root.append(
    el('h1', 'Switch participant code?'),
    el('p', `This phone is set up as ${current}, and this link is for ${next}. Your entries on this phone stay as they are either way.`),
    switchButton,
    keepButton,
  );
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
