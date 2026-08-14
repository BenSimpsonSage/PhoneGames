"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * localStorage as an external store.
 *
 * Reading storage during render would desync server and client HTML, and
 * hydrating from an effect causes a cascading re-render. `useSyncExternalStore`
 * is built for exactly this: it renders the default on the server, the real
 * value on the client, and React reconciles the difference itself.
 */

type Cached = { raw: string | null; value: unknown };

const cache = new Map<string, Cached>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

/**
 * Snapshots must be referentially stable between renders or React loops
 * forever, so a parsed object is cached and only re-parsed when the raw
 * string actually changes.
 */
function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }

  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function subscribe(key: string, listener: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);

  // Keeps two tabs (or a tab and the installed PWA) in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.get(key)?.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersistentState<T>(key: string, initial: T) {
  // Callers pass literals like `[]`, which would be a fresh object on every
  // render. React requires a stable server snapshot, so freeze the first one.
  const [frozenInitial] = useState(initial);

  const value = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(key, listener), [key]),
    useCallback(() => read(key, frozenInitial), [key, frozenInitial]),
    useCallback(() => frozenInitial, [frozenInitial]),
  );

  const hydrated = useIsHydrated();

  const setValue = useCallback(
    (update: T | ((current: T) => T)) => {
      const next =
        typeof update === "function"
          ? (update as (current: T) => T)(read(key, frozenInitial))
          : update;
      try {
        const raw = JSON.stringify(next);
        window.localStorage.setItem(key, raw);
        cache.set(key, { raw, value: next });
      } catch {
        // Quota or private mode: keep the value in memory so the session
        // still behaves, it just won't survive a reload.
        cache.set(key, { raw: cache.get(key)?.raw ?? null, value: next });
      }
      notify(key);
    },
    [key, frozenInitial],
  );

  return [value, setValue, hydrated] as const;
}

// Module-level so the subscribe identity is stable across renders.
const noopSubscribe = () => () => {};
const alwaysTrue = () => true;
const alwaysFalse = () => false;

/**
 * False during server render and the hydrating render, true afterwards.
 * Lets callers hold back "nothing saved yet" copy until storage has been read.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, alwaysTrue, alwaysFalse);
}

