import type { Route } from '../../events';
import { actions, button, h, screen } from '../dom';
import { canContinue, CUSTOM, CUSTOM_NAME_MAX, isPicked, ITEM_CHOICES, type ChoiceId, type SetupState } from './state';

export interface SetupHandlers {
  chooseRoute(route: Route): void;
  toggleItem(choice: ChoiceId): void;
  setCustomName(name: string): void;
  next(): void;
  back(): void;
}

const ROUTE_OPTIONS: { route: Route; title: string; description: string }[] = [
  { route: 'items', title: "I've got things in mind", description: "Pick what you're saving up for and put a rough price on each." },
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
        h(
          'label',
          { class: 'choice' },
          h('input', {
            type: 'radio',
            name: 'route',
            checked: state.route === option.route,
            onChange: () => on.chooseRoute(option.route),
          }),
          h('span', { class: 'choice-title' }, option.title),
          h('span', { class: 'choice-description' }, option.description),
        ),
      ),
    ),
    actions(button('Continue', on.next, 'primary', !canContinue(state))),
  );
}

export function itemsScreen(state: SetupState, on: SetupHandlers): HTMLElement {
  const customPicked = isPicked(state, CUSTOM);
  const customName = state.items.find((item) => item.choice === CUSTOM)?.name ?? '';

  return screen(
    h('h1', { id: 'items-question', tabindex: -1 }, 'What are you saving up for?'),
    h('p', { class: 'lead' }, "Pick all that apply. You'll put a rough price on each next."),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-labelledby': 'items-question' },
      ...ITEM_CHOICES.map((c) => chip(c.name, 'hint' in c ? c.hint : undefined, isPicked(state, c.id), () => on.toggleItem(c.id))),
      chip('Something else', undefined, customPicked, () => on.toggleItem(CUSTOM)),
    ),
    customPicked &&
      h(
        'label',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'What is it?'),
        h('input', {
          type: 'text',
          class: 'text-input',
          value: customName,
          maxlength: CUSTOM_NAME_MAX,
          autocomplete: 'off',
          onInput: (e: Event) => on.setCustomName((e.target as HTMLInputElement).value),
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

function chip(name: string, hint: string | undefined, pressed: boolean, onClick: () => void): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'chip', 'aria-pressed': String(pressed), onClick },
    h('span', { class: 'chip-name' }, name),
    hint && h('span', { class: 'chip-hint' }, hint),
  );
}
