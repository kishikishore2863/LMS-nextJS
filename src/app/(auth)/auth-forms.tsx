"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, registerAction, googleSignInAction } from "@/server/actions/auth.actions";
import { Alert, Button, FieldLabel, Input, Label } from "@/components/ui";

const DEMO = [
  ["Admin", "admin@lms.test"],
  ["Manager", "manager1@lms.test"],
  ["Learner", "learner1@lms.test"],
] as const;

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const params = useSearchParams();
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={params.get("callbackUrl") ?? "/"} />
        {state?.error && <Alert>{state.error}</Alert>}
        <Label>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" autoComplete="email" required id="email" />
        </Label>
        <Label>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" autoComplete="current-password" required id="password" />
        </Label>
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      {googleEnabled && (
        <form action={googleSignInAction}>
          <Button type="submit" variant="secondary" className="w-full">Continue with Google</Button>
        </form>
      )}
      <p className="text-center text-sm text-muted">
        New here? <Link href="/register" className="font-medium text-primary">Create an account</Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
          <p className="mb-1.5 font-medium text-foreground">Demo accounts (seed data)</p>
          <ul className="space-y-0.5">
            {DEMO.map(([role, email]) => (
              <li key={email}><span className="inline-block w-16">{role}</span><code>{email}</code></li>
            ))}
          </ul>
          <p className="mt-1.5">Password for all demo accounts is set in <code>prisma/seed.ts</code>.</p>
        </div>
      )}
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <Label>
        <FieldLabel>Full name</FieldLabel>
        <Input name="name" required minLength={2} autoComplete="name" />
      </Label>
      <Label>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" required autoComplete="email" />
      </Label>
      <Label hint="At least 8 characters">
        <FieldLabel>Password</FieldLabel>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Label>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-primary">Sign in</Link>
      </p>
    </form>
  );
}
