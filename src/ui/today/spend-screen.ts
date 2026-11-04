import { formatSGD } from '../../calc/money';
import { actions, button, h, screen } from '../dom';
import { chip } from '../fields';
import { LINE_ISSUE_TEXT, type SpendDraft, type SpendLine } from '../spends';

export interface SpendHandlers {
  setText(text: string): void;
  chooseDate(choice: 'today' | 'yesterday' | 'pick'): void;
  setDate(date: string): void;
  cancel(): void;
  save(): void;
  saveAndAddAnother(): void;
  review(): void;
  remove(): void;
}

export interface SpendScreenView {
  draft: SpendDraft;
  today: string;
  yesterday: string;
  min: string;
  lines: SpendLine[];
  dateLabel: (iso: string) => string;
  savedMessage: string | null;
}

export function lineSummary(line: SpendLine, dateLabel: (iso: string) => string): string {
  if (!line.ok) return LINE_ISSUE_TEXT[line.issue];
  const when = `${dateLabel(line.date)}${line.dateFromLine ? ' (from the line)' : ''}`;
  return [when, formatSGD(line.amountCents), line.note].filter(Boolean).join(', ');
}

export function spendScreen(view: SpendScreenView, on: SpendHandlers): HTMLElement {
  const { draft, lines } = view;
  const isNew = draft.id === null;
  const isToday = !draft.picking && draft.date === view.today;
  const isYesterday = !draft.picking && draft.date === view.yesterday;
  const several = lines.length > 1;
  const readable = lines.filter((line) => line.ok).length;
  const onInput = (e: Event) => on.setText((e.target as HTMLInputElement | HTMLTextAreaElement).value);

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
        h('span', { class: 'field-label' }, isNew ? 'Amount and note, one spend per line' : 'Amount and note'),
        h(
          'p',
          { class: 'field-help' },
          isNew
            ? 'For example, 12.50 white beehoon. Start a line with a date, like 2 Nov, 2/11 or yesterday, to log it for that day.'
            : 'For example, 12.50 white beehoon. The note is optional.',
        ),
        isNew
          ? h('textarea', { class: 'text-input text-area', rows: 3, autocomplete: 'off', onInput }, draft.text)
          : h('input', { type: 'text', class: 'text-input', inputmode: 'text', autocomplete: 'off', value: draft.text, onInput }),
        several
          ? h(
              'ul',
              { class: 'line-preview', 'aria-live': 'polite' },
              ...lines.map((line) =>
                h('li', { class: line.ok ? '' : 'line-flagged' }, h('span', { class: 'goal-meta' }, line.line), h('span', {}, lineSummary(line, view.dateLabel))),
              ),
            )
          : h('p', { class: 'goal-meta parse-preview', 'aria-live': 'polite' }, lines[0] && draft.text.trim() ? lineSummary(lines[0], view.dateLabel) : ''),
      ),
      h(
        'div',
        { class: 'field', role: 'group', 'aria-label': 'Date' },
        h('span', { class: 'field-label' }, several ? 'Date for lines without one' : 'Date'),
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
    !isNew
      ? actions(button('Cancel', on.cancel), button('Save', on.save, 'primary', !(lines.length === 1 && lines[0]!.ok)))
      : several
        ? actions(button(readable === 0 ? 'Review spends' : `Review ${readable} ${readable === 1 ? 'spend' : 'spends'}`, on.review, 'primary', readable === 0))
        : actions(
            button('Save and add another', on.saveAndAddAnother, 'secondary', !lines[0]?.ok),
            button('Save', on.save, 'primary', !lines[0]?.ok),
          ),
    h('button', { type: 'button', class: 'text-button', onClick: isNew ? on.cancel : on.remove }, isNew ? 'Cancel' : 'Delete this spend'),
  );
}

export interface ReviewHandlers {
  back(): void;
  confirm(): void;
}

export function reviewSpendsScreen(lines: SpendLine[], dateLabel: (iso: string) => string, on: ReviewHandlers): HTMLElement {
  const readable = lines.filter((line): line is Extract<SpendLine, { ok: true }> => line.ok);
  const flagged = lines.filter((line) => !line.ok);
  return screen(
    h('h1', { tabindex: -1 }, 'Check these spends'),
    h('p', { class: 'lead' }, 'Nothing is saved until you confirm.'),
    h(
      'div',
      { class: 'spend-list' },
      ...readable.map((line) =>
        h(
          'div',
          { class: 'spend-row review-row' },
          h(
            'span',
            { class: 'spend-text' },
            h('span', {}, `${dateLabel(line.date)}${line.dateFromLine ? ', date from the line' : ', date from the buttons'}`),
            line.note && h('span', { class: 'goal-meta' }, line.note),
          ),
          h('span', { class: 'spend-amount' }, formatSGD(line.amountCents)),
        ),
      ),
    ),
    flagged.length > 0 &&
      h(
        'div',
        { class: 'card card-care' },
        h('p', {}, `${flagged.length} ${flagged.length === 1 ? "line can't" : "lines can't"} be read yet. ${flagged.length === 1 ? 'It stays' : 'They stay'} in the box with the reason, so you can fix ${flagged.length === 1 ? 'it' : 'them'}.`),
        h('ul', { class: 'line-preview' }, ...flagged.map((line) => h('li', {}, h('span', { class: 'goal-meta' }, line.line), h('span', {}, lineSummary(line, dateLabel))))),
      ),
    actions(button('Back', on.back), button(`Save ${readable.length} ${readable.length === 1 ? 'spend' : 'spends'}`, on.confirm, 'primary')),
  );
}
