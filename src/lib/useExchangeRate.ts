import { useEffect, useState } from 'react';
import { getJpyToKrw, type ExchangeRate } from './exchange';

// One in-flight request shared by every component that asks while it is pending (the scan
// result and an expanded history entry can mount together).
let pending: Promise<ExchangeRate | null> | null = null;

function load(): Promise<ExchangeRate | null> {
  if (!pending) {
    pending = getJpyToKrw().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function useExchangeRate(): ExchangeRate | null {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((r) => {
      if (alive) setRate(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  return rate;
}
