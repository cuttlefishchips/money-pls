import type { UsageLogger } from '../../events';
import type { Store } from '../../storage';
import { comingSoonScreen, itemsScreen, routeScreen, type SetupHandlers } from './screens';
import {
  canContinue,
  chooseRoute,
  loadSetup,
  previousStep,
  setCustomName,
  SETUP_KEY,
  stepAfterRoute,
  toggleItem,
  type SetupState,
} from './state';

export async function runSetup(root: HTMLElement, store: Store, logger: UsageLogger): Promise<void> {
  let state = loadSetup(await store.getValue(SETUP_KEY));

  const save = (next: SetupState) => {
    state = next;
    void store.setValue(SETUP_KEY, state);
  };

  const update = (next: SetupState, isNewScreen = false) => {
    save(next);
    render(isNewScreen);
  };

  const on: SetupHandlers = {
    chooseRoute: (route) => update(chooseRoute(state, route)),
    toggleItem: (choice) => update(toggleItem(state, choice)),
    setCustomName: (name) => {
      save(setCustomName(state, name));
      root.querySelector<HTMLButtonElement>('.button-primary')!.disabled = !canContinue(state);
    },
    next: () => {
      if (state.step === 'route' && state.route) {
        void logger.logOnce('start_route', { route: state.route });
        update({ ...state, step: stepAfterRoute(state.route) }, true);
      } else if (state.step === 'items') {
        update({ ...state, step: 'prices' }, true);
      }
    },
    back: () => update({ ...state, step: previousStep(state) }, true),
  };

  function render(isNewScreen: boolean) {
    const focusable = () => [...root.querySelectorAll<HTMLElement>('input, button')];
    const focusedIndex = focusable().findIndex((el) => el === document.activeElement);
    const view =
      state.step === 'route' ? routeScreen(state, on) : state.step === 'items' ? itemsScreen(state, on) : comingSoonScreen(on);
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
