import type { YearMonth } from '../../calc/dates';
import { formatDollarsInput } from '../../calc/money';
import type { Route } from '../../events';
import { actions, button, h, screen } from '../dom';
import {
  canContinue,
  CUSTOM,
  CUSTOM_NAME_MAX,
  isBefore,
  isPicked,
  ITEM_CHOICES,
  ITEM_NAME_MAX,
  needsSavings,
  TARGET_YEARS_AHEAD,
  type ChoiceId,
  type NumberField,
  type PartialMonth,
  type SetupState,
} from './state';

export interface SetupHandlers {
  chooseRoute(route: Route): void;
  toggleItem(choice: ChoiceId): void;
  setCustomName(name: string): void;
  setItemName(index: number, name: string): void;
  setItemCost(index: number, text: string): void;
  setTarget(target: PartialMonth): void;
  setNumber(field: NumberField, text: string): void;
  next(): void;
  back(): void;
}

const ROUTE_OPTIONS: { route: Route; title: string; description: string }[] = [
  { route: 'items', title: "I've got things in mind", description: "Pick what you're saving up for and put a rough price on each." },
  { route: 'none', title: 'Not sure yet', description: 'Start with a safety floor and a simple split. You can set a target later.' },
];

export function routeScreen(state: SetupState, on: SetupHandlers, now: YearMonth): HTMLElement {
  return screen(
    h('h1', { id: 'route-question', tabindex: -1 }, 'What would make the next few years feel good?'),
    h('p', { class: 'lead' }, 'Pick the one that fits best. You can come back and change it.'),
    h(
      'div',
      { class: 'choices', role: 'radiogroup', 'aria-labelledby': 'route-question' },
      ...ROUTE_OPTIONS.map((option) =>
        h(
          'label',
          { class: 'choice' },
          h('input', {
            type: 'radio',
            name: 'route',
            checked: state.route === option.route,
            onChange: () => on.chooseRoute(option.route),
          }),
          h('span', { class: 'choice-title' }, option.title),
          h('span', { class: 'choice-description' }, option.description),
        ),
      ),
    ),
    actions(button('Continue', on.next, 'primary', !canContinue(state, now))),
  );
}

export function itemsScreen(state: SetupState, on: SetupHandlers, now: YearMonth): HTMLElement {
  const customPicked = isPicked(state, CUSTOM);
  const customName = state.items.find((item) => item.choice === CUSTOM)?.name ?? '';

  return screen(
    h('h1', { id: 'items-question', tabindex: -1 }, 'What are you saving up for?'),
    h('p', { class: 'lead' }, "Pick all that apply. You'll put a rough price on each next."),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-labelledby': 'items-question' },
      ...ITEM_CHOICES.map((c) => chip(c.name, 'hint' in c ? c.hint : undefined, isPicked(state, c.id), () => on.toggleItem(c.id))),
      chip('Something else', undefined, customPicked, () => on.toggleItem(CUSTOM)),
    ),
    customPicked &&
      h(
        'label',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'What is it?'),
        h('input', {
          type: 'text',
          class: 'text-input',
          value: customName,
          maxlength: CUSTOM_NAME_MAX,
          autocomplete: 'off',
          onInput: (e: Event) => on.setCustomName((e.target as HTMLInputElement).value),
        }),
      ),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canContinue(state, now))),
  );
}

export function comingSoonScreen(_state: SetupState, on: SetupHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, 'Coming soon'),
    h('p', { class: 'lead' }, 'This part of set-up is still being built.'),
    actions(button('Back', on.back)),
  );
}

export function pricesScreen(state: SetupState, on: SetupHandlers, now: YearMonth): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, 'Put a rough price on each'),
    h('p', { class: 'lead' }, 'Think of the last time you paid for something similar. Roughly is fine.'),
    h(
      'div',
      { class: 'cards' },
      ...state.items.map((item, i) =>
        h(
          'fieldset',
          { class: 'card' },
          h('legend', { class: 'visually-hidden' }, item.name || 'Item'),
          h(
            'label',
            { class: 'field' },
            h('span', { class: 'field-label' }, 'Name'),
            h('input', {
              type: 'text',
              class: 'text-input',
              value: item.name,
              maxlength: ITEM_NAME_MAX,
              autocomplete: 'off',
              onInput: (e: Event) => on.setItemName(i, (e.target as HTMLInputElement).value),
            }),
          ),
          moneyField('Rough price', undefined, item.costCents, (text) => on.setItemCost(i, text)),
        ),
      ),
    ),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canContinue(state, now))),
  );
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function dateScreen(state: SetupState, on: SetupHandlers, now: YearMonth): HTMLElement {
  const { year, month } = state.target;
  const years = Array.from({ length: TARGET_YEARS_AHEAD + 1 }, (_, i) => now.year + i);
  const heading = state.items.length === 1 ? 'When would you like to have it by?' : 'When would you like to have these by?';

  return screen(
    h('h1', { tabindex: -1 }, heading),
    h('p', { class: 'lead' }, 'Pick one month for everything. You can change it later.'),
    h(
      'div',
      { class: 'field-row' },
      select(
        'Month',
        month,
        MONTH_NAMES.map((name, i) => ({
          value: i + 1,
          label: name,
          disabled: year !== null && isBefore({ year, month: i + 1 }, now),
        })),
        (value) => on.setTarget({ year, month: value }),
      ),
      select(
        'Year',
        year,
        years.map((y) => ({ value: y, label: String(y) })),
        (value) => on.setTarget({ year: value, month }),
      ),
    ),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canContinue(state, now))),
  );
}

export function numbersScreen(state: SetupState, on: SetupHandlers, now: YearMonth): HTMLElement {
  const { payCents, fixedCents, savingsCents } = state.numbers;
  return screen(
    h('h1', { tabindex: -1 }, 'Your starting numbers'),
    h('p', { class: 'lead' }, 'Roughly is fine.'),
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
      needsSavings(state) &&
        moneyField(
          'Savings set aside for this',
          "Money you've already put aside for these. Enter 0 if none.",
          savingsCents,
          (text) => on.setNumber('savingsCents', text),
        ),
    ),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canContinue(state, now))),
  );
}

let fieldId = 0;

function moneyField(label: string, help: string | undefined, cents: number | null, onInput: (text: string) => void) {
  const id = `field-${++fieldId}`;
  return h(
    'div',
    { class: 'field' },
    h('label', { class: 'field-label', for: id }, label),
    help && h('p', { class: 'field-help', id: `${id}-help` }, help),
    h(
      'div',
      { class: 'money-input' },
      h('span', { class: 'money-prefix', 'aria-hidden': 'true' }, 'S$'),
      h('input', {
        id,
        type: 'text',
        class: 'text-input',
        inputmode: 'decimal',
        autocomplete: 'off',
        value: formatDollarsInput(cents),
        'aria-describedby': help ? `${id}-help` : undefined,
        onInput: (e: Event) => onInput((e.target as HTMLInputElement).value),
      }),
    ),
  );
}

function select(
  label: string,
  value: number | null,
  options: { value: number; label: string; disabled?: boolean }[],
  onChange: (value: number) => void,
) {
  return h(
    'label',
    { class: 'field' },
    h('span', { class: 'field-label' }, label),
    h(
      'select',
      { class: 'text-input', onChange: (e: Event) => onChange(Number((e.target as HTMLSelectElement).value)) },
      h('option', { value: '', disabled: true, selected: value === null }, 'Choose'),
      ...options.map((o) => h('option', { value: o.value, selected: o.value === value, disabled: o.disabled }, o.label)),
    ),
  );
}

function chip(name: string, hint: string | undefined, pressed: boolean, onClick: () => void): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'chip', 'aria-pressed': String(pressed), onClick },
    h('span', { class: 'chip-name' }, name),
    hint && h('span', { class: 'chip-hint' }, hint),
  );
}
