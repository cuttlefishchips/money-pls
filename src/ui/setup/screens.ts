import { actions, button, h, screen } from '../dom';
import { chip, moneyField, textField } from '../fields';
import { canStart, CUSTOM, isPicked, ITEM_CHOICES, ITEM_NAME_MAX, payDone, type AppState, type ChoiceId, type NumberField } from '../state';

export interface GoalsHandlers {
  toggleItem(choice: ChoiceId): void;
  setCustomName(name: string): void;
  notNow(): void;
  next(): void;
}

export function goalsCard(state: AppState, on: GoalsHandlers): HTMLElement {
  const customName = state.items.find((item) => item.choice === CUSTOM)?.name ?? '';
  return h(
    'section',
    { class: 'card goals-card', 'aria-labelledby': 'items-question' },
    h('h2', { id: 'items-question', class: 'card-heading' }, 'What are you saving up for?'),
    h('p', { class: 'goal-meta' }, "Pick all that apply. You can add prices later, and it's fine not to know yet."),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-labelledby': 'items-question' },
      ...ITEM_CHOICES.map((c) => chip(c.name, 'hint' in c ? c.hint : undefined, isPicked(state, c.id), () => on.toggleItem(c.id))),
      chip('Something else', undefined, isPicked(state, CUSTOM), () => on.toggleItem(CUSTOM)),
    ),
    isPicked(state, CUSTOM) && textField('What is it?', customName, ITEM_NAME_MAX, on.setCustomName),
    h('div', { class: 'card-actions goals-actions' }, button('Not now', on.notNow), button('Continue', on.next, 'secondary', !canStart(state))),
  );
}

export interface NumbersHandlers {
  setNumber(field: NumberField, text: string): void;
  setBudget(text: string): void;
  switchEntry?(): void;
  back(): void;
  next(): void;
}

export interface NumbersOptions {
  mode: 'pay' | 'budget';
  setUpMonth: boolean;
  back?: string;
  next: string;
}

export const BUDGET_QUESTION = 'How much do you want to spend this month, on top of rent and bills?';
export const BUDGET_QUESTION_SET_UP_MONTH = 'How much do you want to spend for the rest of this month, on top of rent and bills?';

export function numbersScreen(state: AppState, on: NumbersHandlers, options: NumbersOptions): HTMLElement {
  const { payCents, fixedCents } = state.numbers;
  const budget = options.mode === 'budget';
  const done = budget ? state.budgetCents !== null : payDone(state);
  return screen(
    h('h1', { tabindex: -1 }, budget ? 'Your monthly budget' : 'Your starting numbers'),
    h('p', { class: 'lead' }, 'So we can work out what you can spend each day. Roughly is fine.'),
    budget
      ? h('div', { class: 'cards' }, moneyField(options.setUpMonth ? BUDGET_QUESTION_SET_UP_MONTH : BUDGET_QUESTION, undefined, state.budgetCents, on.setBudget))
      : h(
          'div',
          { class: 'cards' },
          moneyField('Take-home pay per month', undefined, payCents, (text) => on.setNumber('payCents', text)),
          moneyField(
            'Fixed costs per month',
            'Only costs that are the same every month, like rent or mortgage, bills, insurance and supporting family. Groceries, transport and anything that varies go in your log.',
            fixedCents,
            (text) => on.setNumber('fixedCents', text),
          ),
        ),
    on.switchEntry &&
      h(
        'button',
        { type: 'button', class: 'text-button', onClick: on.switchEntry },
        budget ? 'Use my pay and fixed costs instead' : 'Rather set a monthly budget?',
      ),
    actions(options.back !== undefined && button(options.back, on.back), button(options.next, on.next, 'primary', !done)),
  );
}
