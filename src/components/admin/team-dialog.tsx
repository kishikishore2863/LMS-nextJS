"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, Button, FieldLabel, Input, Label } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/components/ui/use-action";
import { deleteTeamAction, saveTeamAction } from "@/server/actions/admin.actions";

type U = { id: string; name: string; email: string; role: string };

function Picker({ label, users, selected, onChange }: { label: string; users: U[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())), [users, q]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label} <span className="text-muted">({selected.size})</span></legend>
      <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Filter ${label}`} />
      <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
        {shown.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-primary-soft/50">
            <input
              type="checkbox"
              checked={selected.has(u.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(u.id);
                else next.delete(u.id);
                onChange(next);
              }}
            />
            <span>{u.name}</span>
            <span className="ml-auto text-xs text-muted">{u.role.toLowerCase()}</span>
          </label>
        ))}
        {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted">No matches</p>}
      </div>
    </fieldset>
  );
}

export function TeamDialog({
  users,
  team,
}: {
  users: U[];
  team?: { id: string; name: string; managerIds: string[]; memberIds: string[] };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team?.name ?? "");
  const [managers, setManagers] = useState(new Set(team?.managerIds ?? []));
  const [members, setMembers] = useState(new Set(team?.memberIds ?? []));
  const { pending, error, exec } = useAction();
  const managerCandidates = users.filter((u) => u.role !== "LEARNER" || managers.has(u.id));

  return (
    <>
      {team ? (
        <Button variant="ghost" className="px-2 py-1" onClick={() => setOpen(true)} aria-label={`Edit ${team.name}`}><Pencil className="size-4" /></Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus className="size-4" />New team</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={team ? `Edit ${team.name}` : "New team"} wide>
        <form
          className="space-y-4"
          action={() =>
            exec(
              () => saveTeamAction({ name, managerIds: [...managers], memberIds: [...members] }, team?.id),
              () => setOpen(false),
            )
          }
        >
          {error && <Alert>{error}</Alert>}
          <Label><FieldLabel>Team name</FieldLabel><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></Label>
          <div className="grid gap-4 md:grid-cols-2">
            <Picker label="Managers" users={managerCandidates} selected={managers} onChange={setManagers} />
            <Picker label="Members" users={users} selected={members} onChange={setMembers} />
          </div>
          <p className="text-xs text-muted">Only managers and admins can manage a team. Promote a learner to manager on the Users page first.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save team"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeleteTeamButton({ id, name }: { id: string; name: string }) {
  const { pending, exec } = useAction();
  return (
    <Button
      variant="ghost"
      className="px-2 py-1 text-danger"
      disabled={pending}
      aria-label={`Delete ${name}`}
      onClick={() => confirm(`Delete team "${name}"? Learners keep their enrolments.`) && exec(() => deleteTeamAction(id))}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
