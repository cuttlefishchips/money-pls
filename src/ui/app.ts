import { ratingFormUrl } from '../../config/app';
import { toCalDate } from '../calc/dates';
import { formatSGD, parseDollars } from '../calc/money';
import { exportFileName, exportJson, prepareExport, type BudgetViewTracker, type UsageEvent, type UsageLogger } from '../events';
import { currentPlatform } from '../participant/platform';
import { copyText, saveTextFile } from './save-file';
import { usageScreen } from './usage-screen';
import type { Spend, Store } from '../storage';
import { monthLabel } from './fields';
import { goalsCard, numbersScreen } from './setup/screens';
import {
  addItem,
  answerGoals,
  APP_KEY,
  canSaveItem,
  canStart,
  editItem,
  finishSetUp,
  initialState,
  isPriced,
  itemMonth,
  loadState,
  payDone,
  recordSavings,
  removeItem,
  reopenGoals,
  replaceItem,
  sameItem,
  setItemTarget,
  setBudget,
  setEntry,
  setNumber,
  setStartCustomName,
  switchToPay,
  toggleStartItem,
  type AppState,
  type GoalItem,
} from './state';
import { buildMonthlyCheck } from './today/check';
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
  | { kind: 'numbers'; before: AppState; mode: 'pay' | 'budget' }
  | { kind: 'start-over' }
  | { kind: 'spend'; draft: SpendDraft; savedMessage: string | null }
  | { kind: 'usage'; events: UsageEvent[]; skipped: number; savedNote: string | null };

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
  let checkDraft: number | null = null;
  let checkResultShown = false;

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
    if (state.step === 'numbers' || view.kind === 'numbers') {
      const editing = view.kind === 'numbers' ? view : null;
      const mode = editing ? editing.mode : state.entry;
      const done = () => (mode === 'budget' ? state.budgetCents !== null : payDone(state));
      return numbersScreen(
        state,
        {
          setNumber: (field, text) => {
            save(setNumber(state, field, parseDollars(text)));
            refreshPrimary(done());
          },
          setBudget: (text) => {
            save(setBudget(state, parseDollars(text)));
            refreshPrimary(done());
          },
          switchEntry: editing ? undefined : () => go(setEntry(state, state.entry === 'pay' ? 'budget' : 'pay')),
          back: () => editing && go(editing.before, { kind: 'today' }),
          next: () => {
            if (!editing) go(finishSetUp(state, now), { kind: 'today' });
            else go(mode === 'pay' && state.entry === 'budget' ? switchToPay(state) : state, { kind: 'today' });
          },
        },
        editing ? { mode, back: 'Cancel', next: 'Save' } : { mode, next: 'Continue' },
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

    if (view.kind === 'usage') {
      const fileName = exportFileName(code, now);
      const { events, skipped } = view;
      return usageScreen(
        { events, skipped, code, fileName, savedNote: view.savedNote },
        {
          back: () => go(state, { kind: 'today' }),
          save: async () => {
            const result = await saveTextFile(fileName, exportJson(events));
            if (view.kind !== 'usage') return;
            const savedNote =
              result === 'cancelled' ? null : result === 'shared' ? 'Usage file ready to share.' : `Saved ${fileName}. Check your downloads.`;
            view = { ...view, savedNote };
            render(false);
          },
          copy: async () => {
            const copied = await copyText(exportJson(events));
            if (view.kind !== 'usage') return;
            view = {
              ...view,
              savedNote: copied
                ? 'Usage log copied. Paste it into a message to share it.'
                : "Couldn't copy on this phone. Try Save usage file instead.",
            };
            render(false);
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
          checkResultShown = false;
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
    const current = model(state);
    const answerCard = (answer: 'items' | 'none') => {
      void logger.logOnce('start_route', { route: answer, entry: state.startEntry });
      go(answerGoals(state, answer), view);
    };
    const card =
      state.entry === 'pay' && !state.goalsAnswered
        ? goalsCard(state, {
            toggleItem: (choice) => go(toggleStartItem(state, choice), view, false),
            setCustomName: (name) => {
              save(setStartCustomName(state, name));
              const next = root.querySelector<HTMLButtonElement>('.goals-actions button:last-child');
              if (next) next.disabled = !canStart(state);
            },
            notNow: () => answerCard('none'),
            next: () => answerCard('items'),
          })
        : null;
    const check = buildMonthlyCheck({
      state,
      spends,
      monthlySavingCents: current.status === 'ok' ? current.setAsideCents : null,
      caughtUp: caughtUp(),
      today: now,
    });
    const showCheck = check && (!check.answered || checkResultShown) ? { check, showResult: check.answered, draftCents: checkDraft } : null;
    return todayScreen(
      current,
      {
        notice,
        welcome: showWelcome ? { ratingUrl: ratingFormUrl(code), installed: currentPlatform().standalone } : null,
        caughtUp: { label: dayLabel(caughtUp(), today()), stale: isStale(caughtUp(), today()) },
        spends: spendsThisMonth(spends, today()).map((spend) => {
          const [year, month, day] = spend.date.split('-').map(Number);
          const label = dayLabel({ year: year!, month: month!, day: day! }, today());
          return { spend, label: label.charAt(0).toUpperCase() + label.slice(1) };
        }),
        menuOpen,
        goalsCard: card,
        check: showCheck,
      },
      {
        openGoal: (id) => {
          const item = state.items.find((i) => i.id === id);
          if (item) go(state, { kind: 'edit', draft: item });
        },
        addGoal: () => (state.items.length ? go(state, { kind: 'add' }) : go(reopenGoals(state))),
        addPay: () => go(state, { kind: 'numbers', before: state, mode: 'pay' }),
        setCheckTotal: (text) => {
          checkDraft = parseDollars(text);
          const saveButton = root.querySelector<HTMLButtonElement>('.check-actions button:last-child');
          if (saveButton) saveButton.disabled = checkDraft === null;
        },
        saveCheck: () => {
          if (!check || checkDraft === null) return;
          checkResultShown = true;
          go(recordSavings(state, check.month, checkDraft), view, false);
          checkDraft = null;
        },
        skipCheck: () => {
          if (check) go(recordSavings(state, check.month, null), view, false);
        },
        closeCheck: () => {
          checkResultShown = false;
          render(false);
        },
        logSpend: () => go(state, { kind: 'spend', draft: newSpendDraft(today()), savedMessage: null }),
        openSpend: (id) => {
          const spend = spends.find((s) => s.id === id);
          if (spend) go(state, { kind: 'spend', draft: draftFromSpend(spend, today()), savedMessage: null });
        },
        dismissWelcome: () => {
          showWelcome = false;
          render(false);
        },
        changeNumbers: () => go(state, { kind: 'numbers', before: state, mode: state.entry }),
        toggleMenu: () => {
          menuOpen = !menuOpen;
          render(false);
        },
        startOver: () => go(state, { kind: 'start-over' }),
        openUsage: async () => {
          const { events, skipped } = prepareExport(await store.listUsage());
          go(state, { kind: 'usage', events, skipped, savedNote: null });
        },
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
