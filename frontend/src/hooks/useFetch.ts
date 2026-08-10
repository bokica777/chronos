import { useEffect, useState } from "react";

export function useFetch<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    fetcher(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [fetcher]);

  return { data, error, isLoading };
}
