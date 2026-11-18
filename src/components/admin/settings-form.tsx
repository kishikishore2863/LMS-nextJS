"use client";

import { Alert, Button, FieldLabel, Input, Label, Select } from "@/components/ui";
import { useAction } from "@/components/ui/use-action";
import { saveSettingsAction } from "@/server/actions/admin.actions";

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const { pending, error, message, exec } = useAction();
  return (
    <form
      className="max-w-xl space-y-4"
      action={(fd) => exec(() => saveSettingsAction(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]))))}
    >
      {error && <Alert>{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <Label><FieldLabel>Platform name</FieldLabel><Input name="platformName" defaultValue={values.platformName} /></Label>
      <Label hint="When off, only admins can create accounts"><FieldLabel>Allow self-registration</FieldLabel>
        <Select name="allowSelfRegistration" defaultValue={values.allowSelfRegistration}><option value="true">On</option><option value="false">Off</option></Select>
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label hint="Used for new quizzes"><FieldLabel>Default pass mark %</FieldLabel><Input name="defaultPassPct" type="number" min={1} max={100} defaultValue={values.defaultPassPct} /></Label>
        <Label hint="Used for new quizzes"><FieldLabel>Default max attempts</FieldLabel><Input name="defaultMaxAttempts" type="number" min={1} max={20} defaultValue={values.defaultMaxAttempts} /></Label>
      </div>
      <Label hint="Reminder notifications are sent this many days before a due date"><FieldLabel>Reminder lead time (days)</FieldLabel><Input name="reminderDaysBeforeDue" type="number" min={0} max={30} defaultValue={values.reminderDaysBeforeDue} /></Label>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}
