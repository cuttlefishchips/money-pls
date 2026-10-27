import { actions, button, h, screen } from '../dom';
import { chip, moneyField, textField } from '../fields';
import { canStart, CUSTOM, isPicked, ITEM_CHOICES, ITEM_NAME_MAX, numbersDone, type AppState, type ChoiceId, type NumberField } from '../state';

export interface StartHandlers {
  toggleItem(choice: ChoiceId): void;
  chooseNotSure(): void;
  setCustomName(name: string): void;
  back(): void;
  next(): void;
}

export function startScreen(state: AppState, on: StartHandlers): HTMLElement {
  const customName = state.items.find((item) => item.choice === CUSTOM)?.name ?? '';
  return screen(
    h('h1', { id: 'items-question', tabindex: -1 }, 'What are you saving up for?'),
    h('p', { class: 'lead' }, "Pick all that apply. You can add prices later, and it's fine not to know yet."),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-labelledby': 'items-question' },
      ...ITEM_CHOICES.map((c) => chip(c.name, 'hint' in c ? c.hint : undefined, isPicked(state, c.id), () => on.toggleItem(c.id))),
      chip('Something else', undefined, isPicked(state, CUSTOM), () => on.toggleItem(CUSTOM)),
    ),
    isPicked(state, CUSTOM) && textField('What is it?', customName, ITEM_NAME_MAX, on.setCustomName),
    h('div', { class: 'chips chips-apart' }, chip('Not sure yet', undefined, state.route === 'none', on.chooseNotSure)),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canStart(state))),
  );
}

export interface NumbersHandlers {
  setNumber(field: NumberField, text: string): void;
  back(): void;
  next(): void;
}

export function numbersScreen(state: AppState, on: NumbersHandlers, labels: { back?: string; next: string } = { next: 'Continue' }): HTMLElement {
  const { payCents, fixedCents } = state.numbers;
  return screen(
    h('h1', { tabindex: -1 }, 'Your starting numbers'),
    h('p', { class: 'lead' }, 'So we can work out what you can spend each day. Roughly is fine.'),
    h(
      'div',
      { class: 'cards' },
      moneyField('Take-home pay per month', undefined, payCents, (text) => on.setNumber('payCents', text)),
      moneyField(
        'Fixed costs per month',
        'Rent or mortgage, bills, insurance, groceries, transport, supporting family, other essentials.',
        fixedCents,
        (text) => on.setNumber('fixedCents', text),
      ),
    ),
    actions(labels.back !== undefined && button(labels.back, on.back), button(labels.next, on.next, 'primary', !numbersDone(state))),
  );
}
