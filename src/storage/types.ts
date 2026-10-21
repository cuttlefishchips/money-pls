export const DEFAULT_OWNER = 'me';

export interface Spend {
  id: string;
  owner: string;
  amountCents: number;
  date: string;
  loggedAt: number;
}

export type UsageRecord = Readonly<Record<string, string | number>>;

export interface Store {
  getValue<T>(key: string): Promise<T | undefined>;
  setValue<T>(key: string, value: T): Promise<void>;
  deleteValue(key: string): Promise<void>;
  listSpends(): Promise<Spend[]>;
  putSpend(spend: Spend): Promise<void>;
  deleteSpend(id: string): Promise<void>;
  appendUsage(record: UsageRecord): Promise<void>;
  listUsage(): Promise<UsageRecord[]>;
}
