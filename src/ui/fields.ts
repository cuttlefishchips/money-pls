import type { YearMonth } from '../calc/dates';
import { formatDollarsInput } from '../calc/money';
import { h } from './dom';
import { isBefore, TARGET_YEARS_AHEAD, type PartialMonth } from './state';

export const MONTH_NAMES = [
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

export function monthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

let fieldId = 0;

export function textField(label: string, value: string, maxlength: number, onInput: (text: string) => void): HTMLElement {
  return h(
    'label',
    { class: 'field' },
    h('span', { class: 'field-label' }, label),
    h('input', {
      type: 'text',
      class: 'text-input',
      value,
      maxlength,
      autocomplete: 'off',
      onInput: (e: Event) => onInput((e.target as HTMLInputElement).value),
    }),
  );
}

export function moneyField(label: string, help: string | undefined, cents: number | null, onInput: (text: string) => void) {
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

export function monthPicker(label: string, target: PartialMonth, now: YearMonth, onChange: (target: PartialMonth) => void) {
  const { year, month } = target;
  const id = `field-${++fieldId}`;
  const years = Array.from({ length: TARGET_YEARS_AHEAD + 1 }, (_, i) => now.year + i);
  return h(
    'div',
    { class: 'field', role: 'group', 'aria-labelledby': id },
    h('span', { class: 'field-label', id }, label),
    h(
      'div',
      { class: 'field-row' },
      select(
        'Month',
        month,
        MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name, disabled: year !== null && isBefore({ year, month: i + 1 }, now) })),
        (value) => onChange({ year, month: value }),
      ),
      select(
        'Year',
        year,
        years.map((y) => ({ value: y, label: String(y) })),
        (value) => onChange({ year: value, month }),
      ),
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
    'select',
    {
      class: 'text-input',
      'aria-label': label,
      onChange: (e: Event) => onChange(Number((e.target as HTMLSelectElement).value)),
    },
    h('option', { value: '', disabled: true, selected: value === null }, label),
    ...options.map((o) => h('option', { value: o.value, selected: o.value === value, disabled: o.disabled }, o.label)),
  );
}

export function chip(name: string, hint: string | undefined, pressed: boolean, onClick: () => void): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'chip', 'aria-pressed': String(pressed), onClick },
    h('span', { class: 'chip-name' }, name),
    hint && h('span', { class: 'chip-hint' }, hint),
  );
}
