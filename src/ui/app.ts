import { ratingFormUrl } from '../../config/app';
import { toCalDate } from '../calc/dates';
import { formatSGD, parseDollars } from '../calc/money';
import type { BudgetViewTracker, UsageLogger } from '../events';
import type { Spend, Store } from '../storage';
import { monthLabel } from './fields';
import { numbersScreen, startScreen } from './setup/screens';
import {
  addItem,
  APP_KEY,
  canSaveItem,
  chooseNotSure,
  editItem,
  initialState,
  isPriced,
  itemMonth,
  loadState,
  numbersDone,
  removeItem,
  replaceItem,
  sameItem,
  setItemTarget,
  setNumber,
  setStartCustomName,
  toggleStartItem,
  type AppState,
  type GoalItem,
  type StartingNumbers,
} from './state';
import { buildToday, spentThisMonth } from './today/model';
import { addGoalScreen, editGoalScreen, startOverScreen, todayScreen } from './today/screen';
import { startOver } from './start-over';
import {
  canSaveSpend,
  caughtUpDate,
  dayLabel,
  daysBefore,
  draftFromSpend,
  earliestSpendDate,
  isoDate,
  isStale,
  newSpendDraft,
  parseSpendText,
  spendFromDraft,
  SPENDS_CHANGED_KEY,
  spendsThisMonth,
  spendText,
  type SpendDraft,
} from './spends';
import { spendScreen } from './today/spend-screen';

export interface AppContext {
  root: HTMLElement;
  store: Store;
  logger: UsageLogger;
  budgetViews: BudgetViewTracker;
  code: string;
}

type View =
  | { kind: 'today' }
  | { kind: 'edit'; draft: GoalItem }
  | { kind: 'add' }
  | { kind: 'numbers'; before: StartingNumbers }
  | { kind: 'start-over' }
  | { kind: 'spend'; draft: SpendDraft; savedMessage: string | null };

export function changeNotice(
  name: string,
  month: string,
  before: number | null,
  after: number | null,
  safetyCovers: boolean,
): string {
  const lead = `Adding ${name} by ${month}`;
  if (before === null || after === null) return `${lead}.`;
  if (after === before) {
    const reason = safetyCovers ? ', your safety saving already covers it' : '';
    return `${lead}: still ${formatSGD(after, 'down')} a day${reason}.`;
  }
  const direction = after < before ? 'down from' : 'up from';
  return `${lead}: ${formatSGD(after, 'down')} a day, ${direction} ${formatSGD(before, 'down')}.`;
}

export function spendPreview(text: string): string {
  if (!text.trim()) return '';
  const { amountCents, note } = parseSpendText(text);
  if (amountCents === null) return 'Add an amount, like 12.50, at the start.';
  return note ? `${formatSGD(amountCents)}, ${note}` : formatSGD(amountCents);
}

export async function runApp({ root, store, logger, budgetViews, code }: AppContext): Promise<void> {
  const today = () => toCalDate(new Date());
  let state = loadState(await store.getValue(APP_KEY), today());
  let spends: Spend[] = await store.listSpends();
  let spendsChangedAt =
    (await store.getValue<number>(SPENDS_CHANGED_KEY)) ??
    spends.reduce<number | null>((latest, s) => (latest === null || s.loggedAt > latest ? s.loggedAt : latest), null);
  let view: View = { kind: 'today' };
  let notice: string | null = null;
  let showWelcome = false;
  let menuOpen = false;

  const caughtUp = () => caughtUpDate(spendsChangedAt, state.setupDate, today());
  const model = (s: AppState) =>
    buildToday({ state: s, spentCents: spentThisMonth(spends, today()), today: today(), stale: isStale(caughtUp(), today()) });

  const markSpendsChanged = async () => {
    spendsChangedAt = Date.now();
    await store.setValue(SPENDS_CHANGED_KEY, spendsChangedAt);
  };

  const save = (next: AppState) => {
    state = next;
    void store.setValue(APP_KEY, state);
  };

  const go = (next: AppState, nextView: View = view, isNewScreen = true) => {
    save(next);
    if (nextView.kind !== view.kind) {
      notice = nextView.kind === 'today' ? notice : null;
      menuOpen = false;
    }
    view = nextView;
    render(isNewScreen);
  };

  const refreshPrimary = (enabled: boolean) => {
    const primary = root.querySelector<HTMLButtonElement>('.button-primary');
    if (primary) primary.disabled = !enabled;
  };

  function editDraft(change: (draft: GoalItem) => GoalItem, rerender: boolean) {
    if (view.kind !== 'edit') return;
    view = { kind: 'edit', draft: change(view.draft) };
    if (rerender) render(false);
    else refreshPrimary(canSaveItem(view.draft, today()));
  }

  function saveGoal(draft: GoalItem) {
    const original = state.items.find((item) => item.id === draft.id);
    const wasPriced = original ? isPriced(original) : false;
    const before = model(state).dailyCents;
    const next = replaceItem(state, draft);
    if (!wasPriced) {
      void logger.log('target_decision', { decision: 'accepted' });
      if (state.route === 'none') void logger.logOnce('target_set_later');
      const month = itemMonth(draft);
      const after = model(next);
      notice = changeNotice(draft.name, month ? monthLabel(month) : '', before, after.dailyCents, after.safetyCoversGoals);
    } else if (original && !sameItem(original, draft)) {
      void logger.log('target_decision', { decision: 'adjusted' });
      notice = null;
    }
    go(next, { kind: 'today' });
  }

  function view_(): HTMLElement {
    const now = today();
    if (state.step === 'start') {
      return startScreen(state, {
        toggleItem: (choice) => go(toggleStartItem(state, choice), view, false),
        chooseNotSure: () => go(chooseNotSure(state), view, false),
        setCustomName: (name) => {
          save(setStartCustomName(state, name));
          refreshPrimary(state.items.every((item) => item.name.trim() !== ''));
        },
        next: () => {
          void logger.logOnce('start_route', { route: state.route === 'none' ? 'none' : 'items' });
          go({ ...state, step: 'numbers' });
        },
      });
    }

    if (state.step === 'numbers' || view.kind === 'numbers') {
      const editing = view.kind === 'numbers' ? view : null;
      return numbersScreen(
        state,
        {
          setNumber: (field, text) => {
            save(setNumber(state, field, parseDollars(text)));
            refreshPrimary(numbersDone(state));
          },
          back: () =>
            editing ? go({ ...state, numbers: editing.before }, { kind: 'today' }) : go({ ...state, step: 'start' }),
          next: () =>
            editing ? go(state, { kind: 'today' }) : go({ ...state, step: 'today', setupDate: state.setupDate ?? now }, { kind: 'today' }),
        },
        editing ? { back: 'Cancel', next: 'Save' } : undefined,
      );
    }

    if (view.kind === 'edit') {
      const { draft } = view;
      return editGoalScreen(draft, canSaveItem(draft, now), now, {
        setName: (name) => editDraft((d) => editItem(d, { name }), false),
        setCost: (text) => editDraft((d) => editItem(d, { costCents: parseDollars(text) }), false),
        setSaved: (text) => editDraft((d) => editItem(d, { savedCents: parseDollars(text) }), false),
        setUseFixedCostMonths: (use) => editDraft((d) => editItem(d, { useFixedCostMonths: use }), true),
        setTarget: (target) => editDraft((d) => setItemTarget(d, target, now), true),
        cancel: () => go(state, { kind: 'today' }),
        save: () => {
          if (view.kind === 'edit') saveGoal(view.draft);
        },
        remove: () => {
          const original = state.items.find((item) => item.id === draft.id);
          if (original && isPriced(original)) void logger.log('target_decision', { decision: 'rejected' });
          notice = null;
          go(removeItem(state, draft.id), { kind: 'today' });
        },
      });
    }

    if (view.kind === 'spend') {
      const { draft, savedMessage } = view;
      const todayIso = isoDate(now);
      const yesterdayIso = isoDate(daysBefore(now, 1));
      const refresh = () => {
        if (view.kind !== 'spend') return;
        const enabled = canSaveSpend(view.draft, now);
        root.querySelectorAll<HTMLButtonElement>('.actions .button').forEach((b) => {
          if (b.textContent !== 'Cancel') b.disabled = !enabled;
        });
        const preview = root.querySelector('.parse-preview');
        if (preview) preview.textContent = spendPreview(view.draft.text);
      };
      const updateDraft = (change: Partial<SpendDraft>, rerender = false) => {
        if (view.kind !== 'spend') return;
        view = { kind: 'spend', draft: { ...view.draft, ...change }, savedMessage: view.savedMessage };
        if (rerender) render(false);
        else refresh();
      };
      const persist = async (): Promise<Spend | null> => {
        if (view.kind !== 'spend' || !canSaveSpend(view.draft, now)) return null;
        const current = view.draft;
        const existing = spends.find((s) => s.id === current.id);
        const spend = spendFromDraft(current, existing, () => crypto.randomUUID(), Date.now());
        await store.putSpend(spend);
        spends = [...spends.filter((s) => s.id !== spend.id), spend];
        await markSpendsChanged();
        if (!existing) await logger.log('spend_logged');
        return spend;
      };
      return spendScreen(
        {
          draft,
          today: todayIso,
          yesterday: yesterdayIso,
          min: earliestSpendDate(now),
          canSave: canSaveSpend(draft, now),
          preview: spendPreview(draft.text),
          savedMessage,
        },
        {
          setText: (text) => updateDraft({ text }),
          chooseDate: (choice) =>
            updateDraft(
              choice === 'pick' ? { picking: true } : { picking: false, date: choice === 'today' ? todayIso : yesterdayIso },
              true,
            ),
          setDate: (date) => updateDraft({ date }),
          cancel: () => go(state, { kind: 'today' }),
          save: async () => {
            if (await persist()) go(state, { kind: 'today' });
          },
          saveAndAddAnother: async () => {
            const saved = await persist();
            if (!saved || view.kind !== 'spend') return;
            const next = { ...newSpendDraft(now, saved.date), picking: view.draft.picking };
            view = { kind: 'spend', draft: next, savedMessage: `Saved ${spendPreview(spendText(saved))}.` };
            render(false);
            root.querySelector<HTMLInputElement>('input[type=text]')?.focus();
          },
          remove: async () => {
            if (!draft.id) return;
            await store.deleteSpend(draft.id);
            spends = spends.filter((s) => s.id !== draft.id);
            await markSpendsChanged();
            go(state, { kind: 'today' });
          },
        },
      );
    }

    if (view.kind === 'start-over') {
      return startOverScreen({
        cancel: () => go(state, { kind: 'today' }),
        confirm: async () => {
          await startOver(store);
          spends = [];
          spendsChangedAt = null;
          notice = null;
          showWelcome = false;
          state = initialState;
          go(initialState, { kind: 'today' });
        },
      });
    }

    if (view.kind === 'add') {
      return addGoalScreen(state, {
        pick: (choice) => {
          const next = addItem(state, choice);
          go(next, { kind: 'edit', draft: next.items[next.items.length - 1]! });
        },
        back: () => go(state, { kind: 'today' }),
      });
    }

    if (!state.welcomeSeen) {
      showWelcome = true;
      save({ ...state, welcomeSeen: true });
    }
    return todayScreen(
      model(state),
      {
        notice,
        welcome: showWelcome ? { ratingUrl: ratingFormUrl(code), installed: window.matchMedia('(display-mode: standalone)').matches } : null,
        caughtUp: { label: dayLabel(caughtUp(), today()), stale: isStale(caughtUp(), today()) },
        spends: spendsThisMonth(spends, today()).map((spend) => {
          const [year, month, day] = spend.date.split('-').map(Number);
          const label = dayLabel({ year: year!, month: month!, day: day! }, today());
          return { spend, label: label.charAt(0).toUpperCase() + label.slice(1) };
        }),
        menuOpen,
      },
      {
        openGoal: (id) => {
          const item = state.items.find((i) => i.id === id);
          if (item) go(state, { kind: 'edit', draft: item });
        },
        addGoal: () => go(state, { kind: 'add' }),
        logSpend: () => go(state, { kind: 'spend', draft: newSpendDraft(today()), savedMessage: null }),
        openSpend: (id) => {
          const spend = spends.find((s) => s.id === id);
          if (spend) go(state, { kind: 'spend', draft: draftFromSpend(spend, today()), savedMessage: null });
        },
        dismissWelcome: () => {
          showWelcome = false;
          render(false);
        },
        changeNumbers: () => go(state, { kind: 'numbers', before: state.numbers }),
        toggleMenu: () => {
          menuOpen = !menuOpen;
          render(false);
        },
        startOver: () => go(state, { kind: 'start-over' }),
      },
    );
  }

  function render(isNewScreen: boolean) {
    const focusable = () => [...root.querySelectorAll<HTMLElement>('input, select, button, a')];
    const focusedIndex = focusable().findIndex((el) => el === document.activeElement);
    const next = view_();
    root.replaceChildren(next);

    const onToday = state.step === 'today' && view.kind === 'today';
    const current = onToday ? model(state) : null;
    if (current && (current.dailyCents !== null || current.goals.some((g) => g.priced))) budgetViews.enter();
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
