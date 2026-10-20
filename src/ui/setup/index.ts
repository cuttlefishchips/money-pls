import type { UsageLogger } from '../../events';
import type { Store } from '../../storage';
import { areasScreen, comingSoonScreen, routeScreen, type SetupHandlers } from './screens';
import {
  chooseRoute,
  initialSetup,
  previousStep,
  SETUP_KEY,
  stepAfterRoute,
  toggleArea,
  type SetupState,
} from './state';

export async function runSetup(root: HTMLElement, store: Store, logger: UsageLogger): Promise<void> {
  let state = (await store.getValue<SetupState>(SETUP_KEY)) ?? initialSetup;

  const update = (next: SetupState, focus = false) => {
    state = next;
    void store.setValue(SETUP_KEY, state);
    render(focus);
  };

  const on: SetupHandlers = {
    chooseRoute: (route) => update(chooseRoute(state, route)),
    toggleArea: (id) => update(toggleArea(state, id)),
    next: () => {
      if (state.step === 'route' && state.route) {
        void logger.logOnce('start_route', { route: state.route });
        update({ ...state, step: stepAfterRoute(state.route) }, true);
      } else if (state.step === 'areas') {
        update({ ...state, step: 'items' }, true);
      }
    },
    back: () => update({ ...state, step: previousStep(state) }, true),
  };

  function render(isNewScreen: boolean) {
    const inputs = () => [...root.querySelectorAll('input')];
    const focusedIndex = inputs().findIndex((input) => input === document.activeElement);
    const view =
      state.step === 'route' ? routeScreen(state, on) : state.step === 'areas' ? areasScreen(state, on) : comingSoonScreen(on);
    root.replaceChildren(view);
    if (isNewScreen) {
      window.scrollTo(0, 0);
      view.querySelector<HTMLElement>('h1')?.focus();
    } else if (focusedIndex >= 0) {
      inputs()[focusedIndex]?.focus();
    }
  }

  render(false);
}
