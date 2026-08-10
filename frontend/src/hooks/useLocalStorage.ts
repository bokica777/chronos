import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : initialValue;
  });

  const updateValue = (nextValue: T) => {
    localStorage.setItem(key, JSON.stringify(nextValue));
    setValue(nextValue);
  };

  return [value, updateValue] as const;
}
