import { sortSpends } from './memory';
import type { Spend, Store, UsageRecord } from './types';

const DB_VERSION = 1;
const VALUES = 'values';
const SPENDS = 'spends';
const USAGE = 'usage';

export async function openIndexedDbStore(name = 'money-pls', factory: IDBFactory = indexedDB): Promise<Store> {
  const db = await request(
    (() => {
      const open = factory.open(name, DB_VERSION);
      open.onupgradeneeded = () => {
        const upgrade = open.result;
        upgrade.createObjectStore(VALUES);
        upgrade.createObjectStore(SPENDS, { keyPath: 'id' });
        upgrade.createObjectStore(USAGE, { autoIncrement: true });
      };
      return open;
    })(),
  );

  function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const tx = db.transaction(store, mode);
    const result = request(op(tx.objectStore(store)));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    getValue: <T>(key: string) => run(VALUES, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    setValue: async (key, value) => {
      await run(VALUES, 'readwrite', (s) => s.put(value, key));
    },
    listSpends: async () => sortSpends(await run(SPENDS, 'readonly', (s) => s.getAll() as IDBRequest<Spend[]>)),
    putSpend: async (spend) => {
      await run(SPENDS, 'readwrite', (s) => s.put(spend));
    },
    deleteSpend: async (id) => {
      await run(SPENDS, 'readwrite', (s) => s.delete(id));
    },
    appendUsage: async (record) => {
      await run(USAGE, 'readwrite', (s) => s.add(record));
    },
    listUsage: () => run(USAGE, 'readonly', (s) => s.getAll() as IDBRequest<UsageRecord[]>),
  };
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
