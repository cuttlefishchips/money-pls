import { toCalDate } from '../../calc/dates';
import { parseDollars } from '../../calc/money';
import type { UsageLogger } from '../../events';
import type { Store } from '../../storage';
import { comingSoonScreen, dateScreen, itemsScreen, numbersScreen, pricesScreen, routeScreen, type SetupHandlers } from './screens';
import {
  canContinue,
  chooseRoute,
  loadSetup,
  nextStep,
  previousStep,
  setCustomName,
  setItemCost,
  setItemName,
  setNumber,
  setTarget,
  SETUP_KEY,
  toggleItem,
  type SetupState,
  type SetupStep,
} from './state';

const SCREENS: Record<SetupStep, typeof routeScreen> = {
  route: routeScreen,
  items: itemsScreen,
  prices: pricesScreen,
  date: dateScreen,
  numbers: numbersScreen,
  result: comingSoonScreen,
};

export async function runSetup(root: HTMLElement, store: Store, logger: UsageLogger): Promise<void> {
  let state = loadSetup(await store.getValue(SETUP_KEY));
  const thisMonth = () => toCalDate(new Date());

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
    if (continueButton) continueButton.disabled = !canContinue(state, thisMonth());
  };

  const on: SetupHandlers = {
    chooseRoute: (route) => update(chooseRoute(state, route)),
    toggleItem: (choice) => update(toggleItem(state, choice)),
    setCustomName: (name) => saveTyped(setCustomName(state, name)),
    setItemName: (index, name) => saveTyped(setItemName(state, index, name)),
    setItemCost: (index, text) => saveTyped(setItemCost(state, index, parseDollars(text))),
    setTarget: (target) => update(setTarget(state, target, thisMonth())),
    setNumber: (field, text) => saveTyped(setNumber(state, field, parseDollars(text))),
    next: () => {
      if (!canContinue(state, thisMonth())) return;
      if (state.step === 'route' && state.route) void logger.logOnce('start_route', { route: state.route });
      update({ ...state, step: nextStep(state) }, true);
    },
    back: () => update({ ...state, step: previousStep(state) }, true),
  };

  function render(isNewScreen: boolean) {
    const focusable = () => [...root.querySelectorAll<HTMLElement>('input, select, button')];
    const focusedIndex = focusable().findIndex((el) => el === document.activeElement);
    const view = SCREENS[state.step](state, on, thisMonth());
    root.replaceChildren(view);
    if (isNewScreen) {
      window.scrollTo(0, 0);
      view.querySelector<HTMLElement>('h1')?.focus();
    } else if (focusedIndex >= 0) {
      focusable()[focusedIndex]?.focus();
    }
  }

  render(false);
}
