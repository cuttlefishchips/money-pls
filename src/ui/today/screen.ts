import type { YearMonth } from '../../calc/dates';
import { formatSGD } from '../../calc/money';
import { actions, button, h, screen } from '../dom';
import { chip, monthLabel, monthPicker, moneyField, textField } from '../fields';
import { CUSTOM, FUND_CHOICE, isPicked, ITEM_CHOICES, ITEM_NAME_MAX, type AppState, type ChoiceId, type GoalItem, type PartialMonth } from '../state';
import type { Spend } from '../../storage';
import type { MonthlyCheck } from './check';
import type { GoalView, TodayModel } from './model';

export interface TodayView {
  notice: string | null;
  welcome: { ratingUrl: string | null; installed: boolean } | null;
  caughtUp: { label: string; stale: boolean };
  spends: { spend: Spend; label: string }[];
  menuOpen: boolean;
  goalsCard: HTMLElement | null;
  check: { check: MonthlyCheck; showResult: boolean; draftCents: number | null } | null;
}

export interface TodayHandlers {
  openGoal(id: string): void;
  addGoal(): void;
  logSpend(): void;
  openSpend(id: string): void;
  dismissWelcome(): void;
  changeNumbers(): void;
  toggleMenu(): void;
  startOver(): void;
  openUsage(): void;
  addPay(): void;
  setCheckTotal(text: string): void;
  saveCheck(): void;
  skipCheck(): void;
  closeCheck(): void;
}

const CHECK_NUMBERS =
  "Your fixed costs leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers.";

export function todayScreen(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement {
  return screen(
    h(
      'div',
      { class: 'screen-header' },
      h('h1', { tabindex: -1 }, 'Today'),
      h(
        'button',
        {
          type: 'button',
          class: 'button menu-button',
          'aria-label': 'More options',
          'aria-expanded': String(view.menuOpen),
          'aria-controls': 'today-menu',
          onClick: on.toggleMenu,
        },
        '⋯',
      ),
    ),
    view.menuOpen && h('div', { class: 'card menu', id: 'today-menu' }, button('Your usage log', on.openUsage), button('Start over', on.startOver)),
    view.notice && h('div', { class: 'card notice', role: 'status' }, h('p', {}, view.notice)),
    view.welcome && welcomeCard(view.welcome, on),
    view.check && checkCard(view.check, on),
    dailyCard(model, view, on),
    goalsPrompt(model, view, on),
    model.status === 'needs-more' &&
      h(
        'div',
        { class: 'card card-care' },
        h('p', {}, `Your goals need ${formatSGD(model.neededCents ?? 0, 'up')} a month and you have ${formatSGD(model.availableCents ?? 0, 'down')}.`),
        h('p', {}, 'You can move a date later or remove a goal.'),
      ),
    model.status === 'check-numbers' && h('div', { class: 'card card-care' }, h('p', {}, CHECK_NUMBERS)),
    h('h2', { class: 'section-title' }, "This month's spends"),
    view.spends.length
      ? h('div', { class: 'spend-list' }, ...view.spends.map(({ spend, label }) => spendRow(spend, label, on)))
      : h('p', { class: 'goal-meta' }, 'Nothing logged this month yet.'),
    goalsSection(model, view, on),
    h(
      'button',
      { type: 'button', class: 'text-button', onClick: on.changeNumbers },
      model.mode === 'budget' ? 'Change your monthly budget' : 'Change pay or fixed costs',
    ),
  );
}

function goalsPrompt(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement | null {
  if (model.mode === 'budget') {
    return h(
      'button',
      { type: 'button', class: 'card goal goal-button', onClick: on.addPay },
      h('span', { class: 'goal-name' }, "Add your pay to see how much you're saving"),
      h('span', { class: 'goal-meta' }, 'Then pick what you are saving up for, if you like.'),
    );
  }
  return view.goalsCard;
}

function goalsSection(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement | null {
  if (model.mode === 'budget' || view.goalsCard) return null;
  return h(
    'section',
    {},
    h('h2', { class: 'section-title' }, 'Your goals'),
    model.goals.length
      ? h('div', { class: 'cards' }, ...model.goals.map((goal) => goalCard(goal, on)))
      : h('p', { class: 'goal-meta' }, "No goals yet. Add one when you're ready."),
    h('div', { class: 'actions-inline' }, button('Add a goal', on.addGoal)),
    model.mode === 'floor' &&
      model.floorCents !== null &&
      h(
        'div',
        { class: 'card' },
        h('p', { class: 'goal-name' }, 'Safety floor'),
        h('p', { class: 'goal-meta' }, `About ${formatSGD(model.floorCents, 'up')}, 3 months of your fixed costs.`),
      ),
  );
}

function checkCard({ check, showResult, draftCents }: NonNullable<TodayView['check']>, on: TodayHandlers): HTMLElement {
  const days = check.daysNotLogged;
  const logNote =
    days === 0 ? 'Every day was logged.' : `${days} ${days === 1 ? "day wasn't" : "days weren't"} logged, so the real amount may be lower.`;
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'check-title' },
    h('h2', { id: 'check-title', class: 'card-heading' }, 'Your monthly check'),
    check.mostOnPaceCents !== null &&
      h('p', {}, `In ${monthLabel(check.lastMonth)}, the most you were on pace to set aside was about ${formatSGD(check.mostOnPaceCents, 'down')}.`),
    check.mostOnPaceCents !== null &&
      h('p', { class: 'goal-meta' }, `An estimate from pay, fixed costs and logged spends, so it depends on complete logs. ${logNote}`),
    showResult ? checkResult(check, on) : checkQuestion(draftCents, on),
  );
}

function checkQuestion(draftCents: number | null, on: TodayHandlers): HTMLElement {
  return h(
    'div',
    { class: 'cards' },
    moneyField('How much do you have saved in total?', 'Across all your savings. Roughly is fine.', draftCents, on.setCheckTotal),
    h(
      'div',
      { class: 'card-actions check-actions' },
      button('Skip this month', on.skipCheck),
      button('Save', on.saveCheck, 'secondary', draftCents === null),
    ),
  );
}

function checkResult(check: MonthlyCheck, on: TodayHandlers): HTMLElement {
  return h(
    'div',
    { class: 'cards' },
    h(
      'dl',
      { class: 'rows' },
      h('dt', {}, 'Your savings now'),
      h('dd', {}, check.enteredCents === null ? 'Not entered' : formatSGD(check.enteredCents)),
      h('dt', {}, "The plan's expected total"),
      h('dd', {}, check.expectedCents === null ? 'Not set yet' : `about ${formatSGD(check.expectedCents, 'up')}`),
    ),
    h(
      'p',
      { class: 'goal-meta' },
      check.expectedCents === null
        ? 'The expected total shows from next month, once there is a total to start from.'
        : `Your last total of ${formatSGD(check.lastTotalCents ?? 0)} plus this month's set-aside amount. Nothing changes automatically. You decide what, if anything, to adjust.`,
    ),
    h('div', { class: 'card-actions' }, button('Done', on.closeCheck)),
  );
}

function dailyCard(model: TodayModel, view: TodayView, on: TodayHandlers): HTMLElement {
  const ok = model.status === 'ok' && model.dailyCents !== null;
  const tiedTo = model.tiedTo
    ? `a day, keeps you on track for ${model.tiedTo}`
    : model.mode === 'budget'
      ? 'a day, within your monthly budget'
      : model.mode === 'floor'
      ? 'a day, while you build your safety floor'
      : 'a day, keeps your goals on track';

  return h(
    'div',
    { class: 'card daily' },
    h('p', { class: 'daily-label' }, 'Today you can spend about'),
    h('p', { class: 'daily-number' }, ok ? formatSGD(model.dailyCents ?? 0, 'down') : 'Not set yet'),
    ok && h('p', { class: 'daily-label' }, tiedTo),
    ok && view.caughtUp.stale && h('p', { class: 'stale-note' }, `Based on spends logged up to ${view.caughtUp.label}`),
    ok &&
      (model.mode === 'budget'
        ? h('dl', { class: 'rows' }, h('dt', {}, 'Your monthly budget'), h('dd', {}, formatSGD(model.leftCents ?? 0)))
        : h(
            'dl',
            { class: 'rows' },
            h('dt', {}, 'Set aside each month'),
            h('dd', {}, `about ${formatSGD(model.setAsideCents ?? 0, 'up')}`),
            h('dt', {}, 'Left to spend each month'),
            h('dd', {}, `about ${formatSGD(model.leftCents ?? 0, 'down')}`),
          )),
    ok && paceLine(model),
    h('div', { class: 'actions-inline' }, button('Log a spend', on.logSpend, 'primary')),
    h('p', { class: 'goal-meta' }, `Last caught up: ${view.caughtUp.label}`),
  );
}

function spendRow(spend: Spend, label: string, on: TodayHandlers): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'spend-row', onClick: () => on.openSpend(spend.id), 'aria-label': `Edit ${formatSGD(spend.amountCents)} on ${label}` },
    h('span', { class: 'spend-text' }, h('span', {}, label), spend.note && h('span', { class: 'goal-meta' }, spend.note)),
    h('span', { class: 'spend-amount' }, formatSGD(spend.amountCents)),
  );
}

function paceLine(model: TodayModel): HTMLElement | null {
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
  return model.pace === 'within' ? h('p', { class: 'pace' }, "Within this month's budget") : null;
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

export interface StartOverHandlers {
  cancel(): void;
  confirm(): void;
}

export function startOverScreen(on: StartOverHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, 'Start over?'),
    h(
      'p',
      { class: 'lead' },
      'This clears your goals, your pay and fixed costs, and any spends on this phone. Your personal link stays set up.',
    ),
    actions(button('Cancel', on.cancel), button('Start over', on.confirm, 'primary')),
  );
}
