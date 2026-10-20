import type { Route } from '../../events';
import { actions, button, h, screen } from '../dom';
import { AREAS, canContinue, MAX_AREAS, type AreaId, type SetupState } from './state';

export interface SetupHandlers {
  chooseRoute(route: Route): void;
  toggleArea(id: AreaId): void;
  next(): void;
  back(): void;
}

const ROUTE_OPTIONS: { route: Route; title: string; description: string }[] = [
  { route: 'areas', title: 'A few things in my life', description: 'Pick up to three areas and put a rough cost on each.' },
  { route: 'one', title: 'One specific thing', description: 'One thing with a cost and a date, like a course or a trip.' },
  { route: 'none', title: 'Not sure yet', description: 'Start with a safety floor and a simple split. You can set a target later.' },
];

export function routeScreen(state: SetupState, on: SetupHandlers): HTMLElement {
  return screen(
    h('h1', { id: 'route-question', tabindex: -1 }, 'What would make the next few years feel good?'),
    h('p', { class: 'lead' }, 'Pick the one that fits best. You can come back and change it.'),
    h(
      'div',
      { class: 'choices', role: 'radiogroup', 'aria-labelledby': 'route-question' },
      ...ROUTE_OPTIONS.map((option) =>
        choice({
          type: 'radio',
          name: 'route',
          title: option.title,
          description: option.description,
          checked: state.route === option.route,
          onChange: () => on.chooseRoute(option.route),
        }),
      ),
    ),
    actions(button('Continue', on.next, 'primary', !canContinue(state))),
  );
}

export function areasScreen(state: SetupState, on: SetupHandlers): HTMLElement {
  const full = state.areas.length >= MAX_AREAS;
  return screen(
    h('h1', { id: 'areas-question', tabindex: -1 }, 'Which areas matter most to you?'),
    h('p', { class: 'lead' }, `Pick up to ${MAX_AREAS}. You'll put a rough cost on each next.`),
    h('p', { class: 'note', 'aria-live': 'polite' }, `${state.areas.length} of ${MAX_AREAS} picked`),
    h(
      'div',
      { class: 'choices', role: 'group', 'aria-labelledby': 'areas-question' },
      ...AREAS.map((area) => {
        const checked = state.areas.includes(area.id);
        return choice({
          type: 'checkbox',
          name: 'areas',
          title: area.name,
          description: area.description,
          checked,
          disabled: full && !checked,
          onChange: () => on.toggleArea(area.id),
        });
      }),
    ),
    actions(button('Back', on.back), button('Continue', on.next, 'primary', !canContinue(state))),
  );
}

export function comingSoonScreen(on: SetupHandlers): HTMLElement {
  return screen(
    h('h1', { tabindex: -1 }, 'Coming soon'),
    h('p', { class: 'lead' }, 'This part of set-up is still being built.'),
    actions(button('Back', on.back)),
  );
}

interface ChoiceOptions {
  type: 'radio' | 'checkbox';
  name: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function choice(o: ChoiceOptions): HTMLElement {
  return h(
    'label',
    { class: 'choice' },
    h('input', { type: o.type, name: o.name, checked: o.checked, disabled: o.disabled, onChange: o.onChange }),
    h('span', { class: 'choice-title' }, o.title),
    h('span', { class: 'choice-description' }, o.description),
  );
}
