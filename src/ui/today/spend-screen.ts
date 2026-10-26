import { actions, button, h, screen } from '../dom';
import { moneyField } from '../fields';
import type { SpendDraft } from '../spends';

export interface SpendHandlers {
  setAmount(text: string): void;
  setDate(date: string): void;
  cancel(): void;
  save(): void;
  remove(): void;
}

export function spendScreen(draft: SpendDraft, limits: { min: string; max: string }, canSave: boolean, on: SpendHandlers): HTMLElement {
  const isNew = draft.id === null;
  return screen(
    h('h1', { tabindex: -1 }, isNew ? 'Log a spend' : 'Edit spend'),
    h('p', { class: 'lead' }, "Only log spending. Transfers and card bill payments don't count."),
    h(
      'div',
      { class: 'card' },
      moneyField('Amount', undefined, draft.amountCents, on.setAmount),
      h(
        'label',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'Date'),
        h('input', {
          type: 'date',
          class: 'text-input',
          value: draft.date,
          min: limits.min,
          max: limits.max,
          onInput: (e: Event) => on.setDate((e.target as HTMLInputElement).value),
        }),
      ),
    ),
    actions(button('Cancel', on.cancel), button('Save', on.save, 'primary', !canSave)),
    !isNew && h('button', { type: 'button', class: 'text-button', onClick: on.remove }, 'Delete this spend'),
  );
}
