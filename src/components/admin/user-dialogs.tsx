"use client";

import { useState } from "react";
import { Upload, UserPlus } from "lucide-react";
import { Alert, Button, FieldLabel, Input, Label, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/components/ui/use-action";
import { createUserAction, importUsersAction, updateUserAction } from "@/server/actions/admin.actions";

type Team = { id: string; name: string };

export function CreateUserDialog({ teams }: { teams: Team[] }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ tempPassword?: string } | null>(null);
  const { pending, error, exec } = useAction();
  return (
    <>
      <Button onClick={() => { setOpen(true); setCreated(null); }}><UserPlus className="size-4" />New user</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create user">
        {created ? (
          <div className="space-y-4">
            <Alert tone="success">User created.</Alert>
            {created.tempPassword && (
              <p className="text-sm">Temporary password (shown once): <code className="rounded bg-primary-soft px-1.5 py-0.5">{created.tempPassword}</code></p>
            )}
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            action={(fd) =>
              exec(
                () =>
                  createUserAction({
                    name: String(fd.get("name")),
                    email: String(fd.get("email")),
                    role: fd.get("role") as "ADMIN" | "MANAGER" | "LEARNER",
                    teamId: (fd.get("teamId") as string) || undefined,
                    password: (fd.get("password") as string) || undefined,
                  }),
                (d) => setCreated(d ?? {}),
              )
            }
          >
            {error && <Alert>{error}</Alert>}
            <Label><FieldLabel>Name</FieldLabel><Input name="name" required minLength={2} /></Label>
            <Label><FieldLabel>Email</FieldLabel><Input name="email" type="email" required /></Label>
            <div className="grid grid-cols-2 gap-3">
              <Label><FieldLabel>Role</FieldLabel>
                <Select name="role" defaultValue="LEARNER"><option value="LEARNER">Learner</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></Select>
              </Label>
              <Label><FieldLabel>Team</FieldLabel>
                <Select name="teamId" defaultValue=""><option value="">None</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              </Label>
            </div>
            <Label hint="Leave blank to generate a temporary password"><FieldLabel>Password</FieldLabel><Input name="password" type="password" minLength={8} autoComplete="new-password" /></Label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create user"}</Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function ImportUsersDialog() {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const { pending, error, exec } = useAction();
  return (
    <>
      <Button variant="secondary" onClick={() => { setOpen(true); setResult(null); }}><Upload className="size-4" />Import CSV</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Bulk import users" wide>
        <div className="space-y-4">
          <p className="text-sm text-muted">Columns: <code>name,email,role,team</code>. Role defaults to LEARNER; missing teams are created. Existing emails are skipped. New users get a random password and can be reset later.</p>
          {error && <Alert>{error}</Alert>}
          {result && (
            <Alert tone="success">
              Created {result.created}, skipped {result.skipped}.{result.errors.length > 0 && <> Errors: {result.errors.join("; ")}</>}
            </Alert>
          )}
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }}
          />
          <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"name,email,role,team\nJane Doe,jane@example.com,LEARNER,Engineering"} className="font-mono text-xs" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button disabled={pending || !csv.trim()} onClick={() => exec(() => importUsersAction(csv), (d) => d && setResult(d))}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function UserRowActions({ id, role, isActive, self }: { id: string; role: string; isActive: boolean; self: boolean }) {
  const { pending, error, exec } = useAction();
  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Select
        aria-label="Role"
        className="w-28 py-1"
        value={role}
        disabled={pending || self}
        onChange={(e) => exec(() => updateUserAction(id, { role: e.target.value as "ADMIN" | "MANAGER" | "LEARNER" }))}
      >
        <option value="LEARNER">Learner</option>
        <option value="MANAGER">Manager</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <Button variant={isActive ? "secondary" : "primary"} className="py-1" disabled={pending || self} onClick={() => exec(() => updateUserAction(id, { isActive: !isActive }))}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
