"use client";

import { Alert, Button, FieldLabel, Input, Label } from "@/components/ui";
import { useAction } from "@/components/ui/use-action";
import { changePasswordAction } from "@/server/actions/learner.actions";

export function PasswordForm() {
  const { pending, error, message, exec } = useAction();
  return (
    <form className="max-w-sm space-y-4" action={(fd) => exec(() => changePasswordAction(String(fd.get("current")), String(fd.get("next"))))}>
      {error && <Alert>{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <Label><FieldLabel>Current password</FieldLabel><Input name="current" type="password" autoComplete="current-password" /></Label>
      <Label hint="At least 8 characters"><FieldLabel>New password</FieldLabel><Input name="next" type="password" minLength={8} required autoComplete="new-password" /></Label>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
