import { actions, button, h, screen } from '../dom';
import { chip } from '../fields';
import type { SpendDraft } from '../spends';

export interface SpendHandlers {
  setText(text: string): void;
  chooseDate(choice: 'today' | 'yesterday' | 'pick'): void;
  setDate(date: string): void;
  cancel(): void;
  save(): void;
  saveAndAddAnother(): void;
  remove(): void;
}

export interface SpendScreenView {
  draft: SpendDraft;
  today: string;
  yesterday: string;
  min: string;
  canSave: boolean;
  preview: string;
  savedMessage: string | null;
}

export function spendScreen(view: SpendScreenView, on: SpendHandlers): HTMLElement {
  const { draft } = view;
  const isNew = draft.id === null;
  const isToday = !draft.picking && draft.date === view.today;
  const isYesterday = !draft.picking && draft.date === view.yesterday;

  return screen(
    h('h1', { tabindex: -1 }, isNew ? 'Log a spend' : 'Edit spend'),
    h('p', { class: 'lead' }, 'Log every spend that varies, like groceries and transport.'),
    h('p', { class: 'goal-meta' }, "Log only your share. Use the day you paid. Transfers and card bill payments don't count."),
    view.savedMessage && h('div', { class: 'card notice', role: 'status' }, h('p', {}, view.savedMessage)),
    h(
      'div',
      { class: 'card' },
      h(
        'label',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'Amount and note'),
        h('p', { class: 'field-help' }, 'For example, 12.50 white beehoon. The note is optional.'),
        h('input', {
          type: 'text',
          class: 'text-input',
          inputmode: 'text',
          autocomplete: 'off',
          value: draft.text,
          onInput: (e: Event) => on.setText((e.target as HTMLInputElement).value),
        }),
        h('p', { class: 'goal-meta parse-preview', 'aria-live': 'polite' }, view.preview),
      ),
      h(
        'div',
        { class: 'field', role: 'group', 'aria-label': 'Date' },
        h('span', { class: 'field-label' }, 'Date'),
        h(
          'div',
          { class: 'chips' },
          chip('Today', undefined, isToday, () => on.chooseDate('today')),
          chip('Yesterday', undefined, isYesterday, () => on.chooseDate('yesterday')),
          chip('Pick a date', undefined, draft.picking, () => on.chooseDate('pick')),
        ),
        draft.picking &&
          h('input', {
            type: 'date',
            class: 'text-input',
            'aria-label': 'Pick a date',
            value: draft.date,
            min: view.min,
            max: view.today,
            onInput: (e: Event) => on.setDate((e.target as HTMLInputElement).value),
          }),
      ),
    ),
    isNew
      ? actions(button('Save and add another', on.saveAndAddAnother, 'secondary', !view.canSave), button('Save', on.save, 'primary', !view.canSave))
      : actions(button('Cancel', on.cancel), button('Save', on.save, 'primary', !view.canSave)),
    h('button', { type: 'button', class: 'text-button', onClick: isNew ? on.cancel : on.remove }, isNew ? 'Cancel' : 'Delete this spend'),
  );
}
