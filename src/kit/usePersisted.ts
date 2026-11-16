import { useState } from "react";

export function usePersisted<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : initial;
    } catch {
      return initial;
    }
  });
  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    });
  };
  return [value, set];
}
