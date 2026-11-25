import { useCallback, useEffect, useState } from "react";

/** Runs `load()` once and again when `retry()` is called. State is only set from promise callbacks. */
export function useAsync(load) {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(load)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setState({ data: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }));
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry, setData: (data) => setState({ data, loading: false, error: false }) };
}
