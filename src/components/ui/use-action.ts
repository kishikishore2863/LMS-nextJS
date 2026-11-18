"use client";

import { useState, useTransition } from "react";

type Result<T> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/** Runs a server action from a client component and tracks pending / error / message state. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  function exec<T>(fn: () => Promise<Result<T>>, onOk?: (data?: T) => void) {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await fn();
      if (!res) return;
      if (res.ok) {
        if (res.message) setMessage(res.message);
        onOk?.(res.data);
      } else setError(res.error);
    });
  }
  return { pending, error, message, exec, setError, setMessage };
}
