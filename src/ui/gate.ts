import { normaliseCode, type Participant } from '../participant/code';
import { actions, button, h, screen } from './dom';
import { textField } from './fields';

export interface GateActions {
  onSwitch(next: string): void;
  onKeep(current: string): void;
  onEnterCode(code: string): void;
}

export function renderGate(root: HTMLElement, participant: Exclude<Participant, { kind: 'ready' }>, on: GateActions): void {
  if (participant.kind === 'missing') {
    let typed = '';
    const enter = () => {
      const code = normaliseCode(typed);
      if (code) on.onEnterCode(code);
    };
    const continueButton = button('Continue', enter, 'primary', true);
    const field = textField('Enter your participant code', '', 12, (text) => {
      typed = text;
      continueButton.disabled = normaliseCode(typed) === null;
    });
    field.querySelector('input')?.setAttribute('autocapitalize', 'characters');
    field.querySelector('input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enter();
    });
    root.replaceChildren(
      screen(
        h('h1', {}, 'Money Pls'),
        h('p', { class: 'lead' }, 'Enter the participant code from the personal link you were sent, or open Money Pls from that link.'),
        h('div', { class: 'card' }, field, h('p', { class: 'field-help' }, 'Letters and numbers only, like P3.')),
        actions(continueButton),
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

export function renderInstallFirst(root: HTMLElement, code: string | null): void {
  root.replaceChildren(
    screen(
      h('h1', {}, 'Add Money Pls to your home screen first'),
      h(
        'p',
        { class: 'lead' },
        'On iPhone, the app you add to your home screen keeps its own data, separate from Safari. Set up there so nothing is lost.',
      ),
      h(
        'ol',
        { class: 'card steps' },
        h('li', {}, 'Open this link in Safari.'),
        h('li', {}, 'Tap Share, then Add to Home Screen, then Add.'),
        h('li', {}, 'Open Money Pls from your home screen.'),
        h('li', {}, code ? `Enter your participant code: ${code}` : 'Enter the participant code from your link.'),
      ),
      code && h('div', { class: 'card code-card' }, h('p', { class: 'goal-meta' }, 'Your participant code'), h('p', { class: 'code' }, code)),
    ),
  );
}
