import { describeEvent, type UsageEvent } from '../events';
import { actions, button, h, screen } from './dom';

export interface UsageHandlers {
  back(): void;
  save(): void;
}

export interface UsageView {
  events: UsageEvent[];
  skipped: number;
  code: string;
  fileName: string;
  savedNote: string | null;
}

function topActions(...buttons: HTMLElement[]): HTMLElement {
  const row = actions(...buttons);
  row.classList.add('actions-top');
  return row;
}

function dayKey(ts: number): string {
  return new Date(ts).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}

export function usageScreen(view: UsageView, on: UsageHandlers): HTMLElement {
  const newestFirst = [...view.events].reverse();
  const days = new Map<string, UsageEvent[]>();
  for (const event of newestFirst) {
    const key = dayKey(event.ts);
    days.set(key, [...(days.get(key) ?? []), event]);
  }

  return screen(
    h('h1', { tabindex: -1 }, 'Your usage log'),
    h(
      'p',
      { class: 'lead' },
      `This is everything Money Pls records about how you use it, under your code ${view.code}. It never includes amounts, notes or names. You choose whether to share it.`,
    ),
    topActions(button('Back', on.back), button('Save usage file', on.save, 'primary', view.events.length === 0)),
    h('p', { class: 'goal-meta' }, `Saves as ${view.fileName}`),
    view.savedNote && h('div', { class: 'card notice', role: 'status' }, h('p', {}, view.savedNote)),
    view.skipped > 0 &&
      h('p', { class: 'goal-meta' }, `${view.skipped} ${view.skipped === 1 ? 'entry is' : 'entries are'} in an old format and left out.`),
    view.events.length === 0
      ? h('p', { class: 'goal-meta' }, 'Nothing recorded yet.')
      : h(
          'div',
          { class: 'usage-days' },
          ...[...days].map(([day, events]) =>
            h(
              'section',
              {},
              h('h2', { class: 'usage-day' }, day),
              h(
                'ul',
                { class: 'spend-list usage-list' },
                ...events.map((event) =>
                  h('li', { class: 'spend-row usage-row' }, h('span', {}, describeEvent(event)), h('span', { class: 'goal-meta' }, time(event.ts))),
                ),
              ),
            ),
          ),
        ),
  );
}
