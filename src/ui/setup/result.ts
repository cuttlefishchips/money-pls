import type { FloorResult } from '../../calc/floor';
import { formatSGD } from '../../calc/money';
import type { TargetResult } from '../../calc/target';
import { actions, button, h, screen } from '../dom';
import { MONTH_NAMES } from './screens';

export interface ResultHandlers {
  accept(): void;
  changeGoals(): void;
  changeNumbers(): void;
  tryFloor(): void;
}

export type ResultView =
  | { route: 'items'; plan: TargetResult; names: string[]; usesFixedCosts: boolean[]; dailyCents: number | null }
  | { route: 'none'; floor: FloorResult; dailyCents: number | null };

const CHECK_NUMBERS =
  "Your fixed costs leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers.";

export function resultScreen(view: ResultView, on: ResultHandlers): HTMLElement {
  return view.route === 'items' ? targetResult(view, on) : floorResult(view, on);
}

function targetResult(view: Extract<ResultView, { route: 'items' }>, on: ResultHandlers): HTMLElement {
  const { plan } = view;
  if (plan.kind === 'check-numbers') {
    return screen(
      h('h1', { tabindex: -1 }, 'Your plan'),
      h('div', { class: 'card card-care' }, h('p', {}, CHECK_NUMBERS)),
      actions(button('Back', on.changeGoals), button('Change my numbers', on.changeNumbers, 'primary')),
    );
  }

  const items = h(
    'div',
    { class: 'cards' },
    ...plan.items.map((item, i) =>
      h(
        'div',
        { class: 'card goal' },
        h('p', { class: 'goal-name' }, view.names[i] ?? ''),
        h(
          'p',
          { class: 'goal-meta' },
          `${formatSGD(item.priceCents)} by ${MONTH_NAMES[item.targetMonth.month - 1]} ${item.targetMonth.year}`,
          view.usesFixedCosts[i] ? ' (3 months of fixed costs)' : '',
        ),
        item.savedCents > 0 && h('p', { class: 'goal-meta' }, `Saved so far ${formatSGD(item.savedCents)}`),
        h(
          'p',
          { class: 'goal-amount' },
          item.covered ? '✓ Already covered' : `About ${formatSGD(item.monthlyAmountCents, 'up')} a month`,
        ),
      ),
    ),
  );

  if (plan.kind === 'needs-more') {
    return screen(
      h('h1', { tabindex: -1 }, 'Your plan'),
      h(
        'div',
        { class: 'card card-care' },
        h(
          'p',
          {},
          `Your goals need ${formatSGD(plan.monthlyAmountCents, 'up')} a month and you have ${formatSGD(plan.availableCents, 'down')}.`,
        ),
        h('p', {}, 'You can move a date later or remove an item.'),
      ),
      items,
      actions(button('Change my numbers', on.changeNumbers), button('Change goals', on.changeGoals, 'primary')),
    );
  }

  return screen(
    h('h1', { tabindex: -1 }, 'Your plan'),
    h('p', { class: 'lead' }, 'These are estimates. You can change any of them.'),
    dailyCard(view.dailyCents, [
      ['Set aside each month', `about ${formatSGD(plan.monthlyAmountCents, 'up')}`],
      ['Left to spend each month', `about ${formatSGD(plan.safeToSpendCents, 'down')}`],
    ]),
    h('h2', { class: 'section-title' }, 'Your goals'),
    items,
    actions(button('Change', on.changeGoals), button('Accept', on.accept, 'primary')),
    h('button', { type: 'button', class: 'text-button', onClick: on.tryFloor }, 'Try a safety floor instead'),
  );
}

function floorResult(view: Extract<ResultView, { route: 'none' }>, on: ResultHandlers): HTMLElement {
  const { floor } = view;
  if (floor.kind === 'check-numbers') {
    return screen(
      h('h1', { tabindex: -1 }, 'Your starting point'),
      h('div', { class: 'card card-care' }, h('p', {}, CHECK_NUMBERS)),
      actions(button('Change my numbers', on.changeNumbers, 'primary')),
    );
  }
  return screen(
    h('h1', { tabindex: -1 }, 'Your starting point'),
    h('p', { class: 'lead' }, 'A simple split to start with. These are estimates you can change.'),
    dailyCard(view.dailyCents, [
      ['Needs (fixed costs)', formatSGD(floor.needsCents)],
      ['Spending', `about ${formatSGD(floor.spendingCents, 'down')}`],
      ['Saving towards your safety floor', `about ${formatSGD(floor.savingCents, 'up')}`],
    ]),
    h(
      'div',
      { class: 'card' },
      h('p', { class: 'goal-name' }, 'Safety floor'),
      h('p', { class: 'goal-meta' }, `About ${formatSGD(floor.floorCents, 'up')}, 3 months of your fixed costs.`),
    ),
    actions(button('Change', on.changeNumbers), button('Accept', on.accept, 'primary')),
  );
}

function dailyCard(dailyCents: number | null, rows: [string, string][]): HTMLElement {
  return h(
    'div',
    { class: 'card daily' },
    h('p', { class: 'daily-label' }, 'You can spend about'),
    h('p', { class: 'daily-number' }, dailyCents === null ? 'Not set' : formatSGD(dailyCents, 'down')),
    h('p', { class: 'daily-label' }, 'a day for the rest of this month'),
    h(
      'dl',
      { class: 'rows' },
      ...rows.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value)]),
    ),
  );
}

export interface DoneHandlers {
  ratingUrl: string | null;
  installed: boolean;
}

export function doneScreen(on: DoneHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, "You're all set"),
    h('p', { class: 'lead' }, 'Your plan is saved on this phone. Your amounts never leave it.'),
    !on.installed &&
      h(
        'div',
        { class: 'card' },
        h('p', { class: 'goal-name' }, 'Add Money Pls to your home screen'),
        h('p', {}, 'Some phones clear website data after a while. Adding it to your home screen keeps your plan safe.'),
        h('p', { class: 'goal-meta' }, 'iPhone: in Safari, tap Share, then Add to Home Screen.'),
        h('p', { class: 'goal-meta' }, 'Android: in Chrome, tap the ⋮ menu, then Add to Home screen or Install app.'),
      ),
    h(
      'div',
      { class: 'card' },
      h('p', { class: 'goal-name' }, 'How did set-up feel?'),
      on.ratingUrl
        ? h('a', { class: 'button button-primary link-button', href: on.ratingUrl, target: '_blank', rel: 'noopener' }, 'Rate your first session')
        : h('p', { class: 'goal-meta' }, 'Rating form link to be added.'),
    ),
    h('p', { class: 'note' }, 'Your daily number screen comes in the next update.'),
  );
}
