"use client";

import { Button } from "@/components/ui";

export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = /Not allowed|forbidden/i.test(error.message);
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{forbidden ? "You don't have access to this" : "Something went wrong"}</h1>
      <p className="mt-2 text-sm text-muted">{forbidden ? "This page is outside your role or team scope." : "Please try again. If it keeps happening, contact an admin."}</p>
      {!forbidden && <Button className="mt-5" onClick={reset}>Try again</Button>}
    </div>
  );
}
