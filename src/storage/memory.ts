import type { Spend, Store, UsageRecord } from './types';

export function createMemoryStore(): Store {
  const values = new Map<string, unknown>();
  const spends = new Map<string, Spend>();
  const usage: UsageRecord[] = [];

  return {
    async getValue<T>(key: string) {
      return structuredClone(values.get(key)) as T | undefined;
    },
    async setValue(key, value) {
      values.set(key, structuredClone(value));
    },
    async deleteValue(key) {
      values.delete(key);
    },
    async listSpends() {
      return sortSpends([...spends.values()].map((s) => ({ ...s })));
    },
    async putSpend(spend) {
      spends.set(spend.id, { ...spend });
    },
    async deleteSpend(id) {
      spends.delete(id);
    },
    async appendUsage(record) {
      usage.push({ ...record });
    },
    async listUsage() {
      return usage.map((r) => ({ ...r }));
    },
  };
}

export function sortSpends(spends: Spend[]): Spend[] {
  return spends.sort((a, b) => a.date.localeCompare(b.date) || a.loggedAt - b.loggedAt);
}
