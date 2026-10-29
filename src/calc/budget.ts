import { assertCents } from './money';

export interface BudgetPlan {
  safeToSpendCents: number;
  savingCents: 0;
}

export function planBudget(budgetCents: number): BudgetPlan {
  assertCents('budgetCents', budgetCents);
  return { safeToSpendCents: budgetCents, savingCents: 0 };
}
