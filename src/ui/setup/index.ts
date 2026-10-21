import { ratingFormUrl } from '../../../config/app';
import { dailyStatus } from '../../calc/daily';
import { toCalDate, type CalDate } from '../../calc/dates';
import { planFloor } from '../../calc/floor';
import { parseDollars } from '../../calc/money';
import { planTarget } from '../../calc/target';
import type { BudgetViewTracker, UsageLogger } from '../../events';
import type { Store } from '../../storage';
import { doneScreen, resultScreen, type ResultView } from './result';
import { itemsScreen, numbersScreen, pricesScreen, routeScreen, type SetupHandlers } from './screens';
import {
  canContinue,
  chooseRoute,
  decisionOnAccept,
  FUND_CHOICE,
  goTo,
  loadSetup,
  nextStep,
  previousStep,
  removeItem,
  setCustomName,
  setItemCost,
  setItemName,
  setItemSaved,
  setItemTarget,
  setNumber,
  setUseFixedCostMonths,
  SETUP_KEY,
  toggleItem,
  toTargetInputs,
  type SetupState,
} from './state';

export const PLAN_KEY = 'plan';

export interface SavedPlan {
  acceptedOn: CalDate;
  setup: SetupState;
}

export interface SetupContext {
  root: HTMLElement;
  store: Store;
  logger: UsageLogger;
  budgetViews: BudgetViewTracker;
  code: string;
}

export async function runSetup({ root, store, logger, budgetViews, code }: SetupContext): Promise<void> {
  let state = loadSetup(await store.getValue(SETUP_KEY));
  const today = () => toCalDate(new Date());

  const save = (next: SetupState) => {
    state = next;
    void store.setValue(SETUP_KEY, state);
  };

  const update = (next: SetupState, isNewScreen = false) => {
    save(next);
    render(isNewScreen);
  };

  const saveTyped = (next: SetupState) => {
    save(next);
    const continueButton = root.querySelector<HTMLButtonElement>('.button-primary');
    if (continueButton) continueButton.disabled = !canContinue(state, today());
  };

  const on: SetupHandlers = {
    chooseRoute: (route) => update(chooseRoute(state, route)),
    toggleItem: (choice) => update(toggleItem(state, choice)),
    setCustomName: (name) => saveTyped(setCustomName(state, name)),
    setItemName: (i, name) => saveTyped(setItemName(state, i, name)),
    setItemCost: (i, text) => saveTyped(setItemCost(state, i, parseDollars(text))),
    setItemSaved: (i, text) => saveTyped(setItemSaved(state, i, parseDollars(text))),
    setUseFixedCostMonths: (i, use) => update(setUseFixedCostMonths(state, i, use)),
    setItemTarget: (i, target) => update(setItemTarget(state, i, target, today())),
    removeItem: (i) => update(removeItem(state, i), true),
    setNumber: (field, text) => saveTyped(setNumber(state, field, parseDollars(text))),
    next: () => {
      if (!canContinue(state, today())) return;
      if (state.step === 'route' && state.route) void logger.logOnce('start_route', { route: state.route });
      update({ ...state, step: nextStep(state) }, true);
    },
    back: () => update(goTo(state, previousStep(state)), true),
  };

  function resultView(): ResultView {
    const { payCents, fixedCents } = state.numbers;
    const daily = (safeToSpendCents: number) =>
      dailyStatus({ safeToSpendCents, delayItemMonthlyCents: null, spentCents: 0, setupDate: today(), today: today() })
        .dailyCents;

    if (state.route === 'none') {
      const floor = planFloor({ payCents: payCents ?? 0, fixedCents: fixedCents ?? 0 });
      return { route: 'none', floor, dailyCents: floor.kind === 'ok' ? daily(floor.spendingCents) : null };
    }
    const inputs = toTargetInputs(state, today());
    const plan = inputs ? planTarget(inputs) : ({ kind: 'check-numbers' } as const);
    return {
      route: 'items',
      plan,
      names: state.items.map((item) => item.name),
      usesFixedCosts: state.items.map((item) => item.choice === FUND_CHOICE && item.useFixedCostMonths),
      dailyCents: plan.kind === 'ok' ? daily(plan.safeToSpendCents) : null,
    };
  }

  const resultHandlers = {
    accept: async () => {
      if (state.route === 'items') await logger.log('target_decision', { decision: decisionOnAccept(state) });
      await store.setValue<SavedPlan>(PLAN_KEY, { acceptedOn: today(), setup: { ...state, step: 'done' } });
      update({ ...state, step: 'done' }, true);
    },
    changeGoals: () => update(goTo(state, 'prices'), true),
    changeNumbers: () => update(goTo(state, 'numbers'), true),
    tryFloor: async () => {
      await logger.log('target_decision', { decision: 'rejected' });
      update({ ...goTo(state, 'result'), route: 'none', step: 'result' }, true);
    },
  };

  function view(): HTMLElement {
    const now = today();
    switch (state.step) {
      case 'route':
        return routeScreen(state, on, now);
      case 'items':
        return itemsScreen(state, on, now);
      case 'prices':
        return pricesScreen(state, on, now);
      case 'numbers':
        return numbersScreen(state, on, now);
      case 'result':
        return resultScreen(resultView(), {
          accept: () => void resultHandlers.accept(),
          changeGoals: resultHandlers.changeGoals,
          changeNumbers: resultHandlers.changeNumbers,
          tryFloor: () => void resultHandlers.tryFloor(),
        });
      case 'done':
        return doneScreen({
          ratingUrl: ratingFormUrl(code),
          installed: window.matchMedia('(display-mode: standalone)').matches,
        });
    }
  }

  function render(isNewScreen: boolean) {
    const focusable = () => [...root.querySelectorAll<HTMLElement>('input, select, button')];
    const focusedIndex = focusable().findIndex((el) => el === document.activeElement);
    const next = view();
    root.replaceChildren(next);

    const showsBudget = state.step === 'result' && next.querySelector('.daily') !== null;
    if (showsBudget) budgetViews.enter();
    else budgetViews.leave();

    if (isNewScreen) {
      window.scrollTo(0, 0);
      next.querySelector<HTMLElement>('h1')?.focus();
    } else if (focusedIndex >= 0) {
      focusable()[focusedIndex]?.focus();
    }
  }

  render(false);
}
