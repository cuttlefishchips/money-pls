import type { Participant } from '../participant/code';
import { actions, button, h, screen } from './dom';

export interface GateActions {
  onSwitch(next: string): void;
  onKeep(current: string): void;
}

export function renderGate(root: HTMLElement, participant: Exclude<Participant, { kind: 'ready' }>, on: GateActions): void {
  if (participant.kind === 'missing') {
    root.replaceChildren(
      screen(
        h('h1', {}, 'Money Pls'),
        h(
          'p',
          { class: 'lead' },
          'Please open Money Pls from the personal link you were sent. The link tells the app which participant you are.',
        ),
      ),
    );
    return;
  }

  const { current, next } = participant;
  root.replaceChildren(
    screen(
      h('h1', {}, 'Switch participant code?'),
      h(
        'p',
        { class: 'lead' },
        `This phone is set up as ${current}, and this link is for ${next}. Your entries on this phone stay as they are either way.`,
      ),
      actions(button(`Keep ${current}`, () => on.onKeep(current)), button(`Switch to ${next}`, () => on.onSwitch(next))),
    ),
  );
}
