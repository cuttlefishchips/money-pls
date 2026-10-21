import type { YearMonth } from '../../calc/dates';
import { formatSGD } from '../../calc/money';
import { actions, button, h, screen } from '../dom';
import { chip, monthLabel, monthPicker, moneyField, textField } from '../fields';
import { CUSTOM, FUND_CHOICE, isPicked, ITEM_CHOICES, ITEM_NAME_MAX, type AppState, type ChoiceId, type GoalItem, type PartialMonth } from '../state';
import type { GoalView, TodayModel } from './model';

export interface TodayView {
  notice: string | null;
  welcome: { ratingUrl: string | null; installed: boolean } | null;
  lastUpdated: string | null;
  logNote: boolean;
}

export interface TodayHandlers {
  openGoal(id: string): void;
  addGoal(): void;
  logSpend(): void;
  dismissWelcome(): void;
  changeNumbers(): void;
}

const CHECK_NUMBERS =
  "Your fixed costs leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers.";

export function todayScreen(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, 'Today'),
    view.notice && h('div', { class: 'card notice', role: 'status' }, h('p', {}, view.notice)),
    view.welcome && welcomeCard(view.welcome, on),
    dailyCard(model, view, on),
    model.status === 'needs-more' &&
      h(
        'div',
        { class: 'card card-care' },
        h('p', {}, `Your goals need ${formatSGD(model.neededCents ?? 0, 'up')} a month and you have ${formatSGD(model.availableCents ?? 0, 'down')}.`),
        h('p', {}, 'You can move a date later or remove a goal.'),
      ),
    model.status === 'check-numbers' && h('div', { class: 'card card-care' }, h('p', {}, CHECK_NUMBERS)),
    h('h2', { class: 'section-title' }, 'Your goals'),
    h('div', { class: 'cards' }, ...model.goals.map((goal) => goalCard(goal, on))),
    h('div', { class: 'actions-inline' }, button('Add a goal', on.addGoal)),
    model.mode === 'floor' &&
      model.floorCents !== null &&
      h(
        'div',
        { class: 'card' },
        h('p', { class: 'goal-name' }, 'Safety floor'),
        h('p', { class: 'goal-meta' }, `About ${formatSGD(model.floorCents, 'up')}, 3 months of your fixed costs.`),
      ),
    h('button', { type: 'button', class: 'text-button', onClick: on.changeNumbers }, 'Change pay or fixed costs'),
  );
}

function dailyCard(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement {
  const ok = model.status === 'ok' && model.dailyCents !== null;
  const tiedTo = model.tiedTo
    ? `a day, keeps you on track for ${model.tiedTo}`
    : model.mode === 'floor'
      ? 'a day, while you build your safety floor'
      : 'a day, keeps your goals on track';

  return h(
    'div',
    { class: 'card daily' },
    h('p', { class: 'daily-label' }, 'Today you can spend about'),
    h('p', { class: 'daily-number' }, ok ? formatSGD(model.dailyCents ?? 0, 'down') : 'Not set yet'),
    ok && h('p', { class: 'daily-label' }, tiedTo),
    ok &&
      h(
        'dl',
        { class: 'rows' },
        h('dt', {}, 'Set aside each month'),
        h('dd', {}, `about ${formatSGD(model.setAsideCents ?? 0, 'up')}`),
        h('dt', {}, 'Left to spend each month'),
        h('dd', {}, `about ${formatSGD(model.leftCents ?? 0, 'down')}`),
      ),
    ok && paceLine(model),
    h('div', { class: 'actions-inline' }, button('Log a spend', on.logSpend, 'primary')),
    view.logNote && h('p', { class: 'goal-meta', role: 'status' }, 'Logging spends comes in the next update.'),
    h('p', { class: 'goal-meta' }, view.lastUpdated ? `Last updated ${view.lastUpdated}` : 'No spends logged yet'),
  );
}

function paceLine(model: TodayModel): HTMLElement {
  if (model.pace === 'over') {
    const delay =
      model.delayWeeks && model.tiedTo
        ? ` ${model.tiedTo} moves about ${model.delayWeeks} ${model.delayWeeks === 1 ? 'week' : 'weeks'} later.`
        : '';
    return h('p', { class: 'pace pace-care' }, `Over this month's budget.${delay}`);
  }
  if (model.usedUp) return h('p', { class: 'pace pace-care' }, "This month's spending is used up.");
  if (model.pace === 'ahead' && model.freeToEnjoyCents !== null) {
    return h('p', { class: 'pace pace-ahead' }, `About ${formatSGD(model.freeToEnjoyCents, 'down')} free to enjoy`);
  }
  return h('p', { class: 'pace' }, "Within this month's budget");
}

function goalCard(goal: GoalView, on: TodayHandlers): HTMLElement {
  if (!goal.priced) {
    return h(
      'button',
      { type: 'button', class: 'card goal goal-button', onClick: () => on.openGoal(goal.id) },
      h('span', { class: 'goal-name' }, goal.name),
      h('span', { class: 'goal-add' }, 'Add a price and date'),
    );
  }
  const { plan } = goal;
  return h(
    'button',
    { type: 'button', class: 'card goal goal-button', onClick: () => on.openGoal(goal.id) },
    h('span', { class: 'goal-name' }, goal.name),
    h(
      'span',
      { class: 'goal-meta' },
      `${formatSGD(plan.priceCents)} by ${monthLabel(plan.targetMonth)}${goal.usesFixedCosts ? ' (3 months of fixed costs)' : ''}`,
    ),
    plan.savedCents > 0 && h('span', { class: 'goal-meta' }, `Saved so far ${formatSGD(plan.savedCents)}`),
    h('span', { class: 'goal-amount' }, plan.covered ? '✓ Already covered' : `About ${formatSGD(plan.monthlyAmountCents, 'up')} a month`),
  );
}

function welcomeCard(welcome: NonNullable<TodayView['welcome']>, on: TodayHandlers): HTMLElement {
  return h(
    'div',
    { class: 'card' },
    !welcome.installed && h('p', { class: 'goal-name' }, 'Add Money Pls to your home screen'),
    !welcome.installed && h('p', {}, 'Some phones clear website data after a while. Adding it to your home screen keeps your plan safe.'),
    !welcome.installed && h('p', { class: 'goal-meta' }, 'iPhone: in Safari, tap Share, then Add to Home Screen.'),
    !welcome.installed && h('p', { class: 'goal-meta' }, 'Android: in Chrome, tap the ⋮ menu, then Add to Home screen or Install app.'),
    h('p', { class: 'goal-name' }, 'How did set-up feel?'),
    welcome.ratingUrl
      ? h('a', { class: 'button link-button', href: welcome.ratingUrl, target: '_blank', rel: 'noopener' }, 'Rate your first session')
      : h('p', { class: 'goal-meta' }, 'Rating form link to be added.'),
    h('div', { class: 'card-actions' }, button('Got it', on.dismissWelcome)),
  );
}

export interface EditHandlers {
  setName(name: string): void;
  setCost(text: string): void;
  setSaved(text: string): void;
  setUseFixedCostMonths(use: boolean): void;
  setTarget(target: PartialMonth): void;
  cancel(): void;
  save(): void;
  remove(): void;
}

export function editGoalScreen(draft: GoalItem, canSave: boolean, now: YearMonth, on: EditHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, draft.name.trim() || 'New goal'),
    h('p', { class: 'lead' }, 'Think of the last time you paid for something similar. Roughly is fine.'),
    h(
      'div',
      { class: 'card' },
      textField('Name', draft.name, ITEM_NAME_MAX, on.setName),
      draft.choice === FUND_CHOICE &&
        h(
          'label',
          { class: 'check' },
          h('input', {
            type: 'checkbox',
            checked: draft.useFixedCostMonths,
            onChange: (e: Event) => on.setUseFixedCostMonths((e.target as HTMLInputElement).checked),
          }),
          h('span', {}, 'Not sure, use 3 months of my fixed costs'),
        ),
      !draft.useFixedCostMonths && moneyField('Rough price', undefined, draft.costCents, on.setCost),
      monthPicker('By when', draft.target, now, on.setTarget),
      moneyField('Saved so far', 'Optional. Leave blank if none.', draft.savedCents, on.setSaved),
    ),
    actions(button('Cancel', on.cancel), button('Save', on.save, 'primary', !canSave)),
    h('button', { type: 'button', class: 'text-button', onClick: on.remove }, 'Remove this goal'),
  );
}

export interface AddHandlers {
  pick(choice: ChoiceId): void;
  back(): void;
}

export function addGoalScreen(state: AppState, on: AddHandlers): HTMLElement {
  const available = ITEM_CHOICES.filter((c) => !isPicked(state, c.id));
  return screen(
    h('h1', { id: 'add-question', tabindex: -1 }, 'Add a goal'),
    h('p', { class: 'lead' }, 'What else are you saving up for?'),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-labelledby': 'add-question' },
      ...available.map((c) => chip(c.name, 'hint' in c ? c.hint : undefined, false, () => on.pick(c.id))),
      chip('Something else', undefined, false, () => on.pick(CUSTOM)),
    ),
    actions(button('Back', on.back)),
  );
}
