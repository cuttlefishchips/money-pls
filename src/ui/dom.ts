type Child = Node | string | null | false | undefined;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') node.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

export function screen(...children: Child[]): HTMLElement {
  return h('main', { class: 'screen' }, ...children);
}

export function actions(...buttons: Child[]): HTMLElement {
  return h('div', { class: 'actions' }, ...buttons);
}

export function button(label: string, onClick: () => void, kind: 'primary' | 'secondary' = 'secondary', disabled = false) {
  return h(
    'button',
    { type: 'button', class: kind === 'primary' ? 'button button-primary' : 'button', disabled, onClick },
    label,
  );
}
