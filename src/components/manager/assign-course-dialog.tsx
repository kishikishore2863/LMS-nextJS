"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert, Button, FieldLabel, Input, Label, Select } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/components/ui/use-action";
import { assignCourseAction } from "@/server/actions/manager.actions";

type Opt = { id: string; name: string };
type Learner = { id: string; name: string; email: string; teams: string[] };

export function AssignCourseForm({
  courses,
  teams,
  learners,
  defaultScope = "team",
  onDone,
}: {
  courses: Opt[];
  teams: Opt[];
  learners: Learner[];
  defaultScope?: "team" | "users";
  onDone?: () => void;
}) {
  const [scope, setScope] = useState<"team" | "users">(defaultScope);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const { pending, error, exec, message, setMessage } = useAction();
  const shown = useMemo(() => learners.filter((l) => (l.name + l.email).toLowerCase().includes(q.toLowerCase())), [learners, q]);
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        exec(
          () =>
            assignCourseAction({
              courseId: String(fd.get("courseId")),
              teamId: scope === "team" ? String(fd.get("teamId")) : undefined,
              userIds: scope === "users" ? [...selected] : undefined,
              dueDate: (fd.get("dueDate") as string) || null,
            }),
          (d) => {
            setMessage(`Assigned to ${d?.assigned ?? 0} learner${d?.assigned === 1 ? "" : "s"}. They’ve been notified.`);
            setSelected(new Set());
            onDone?.();
          },
        )
      }
    >
      {error && <Alert>{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <Label><FieldLabel>Course</FieldLabel>
        <Select name="courseId" required defaultValue="">
          <option value="" disabled>Select a published course</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Label>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Assign to</legend>
        <div className="flex rounded-lg border border-border p-0.5 text-sm">
          {(["team", "users"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s}
              className={`flex-1 rounded-md px-3 py-1.5 ${scope === s ? "bg-primary text-white" : "text-muted"}`}>
              {s === "team" ? "Whole team" : "Selected learners"}
            </button>
          ))}
        </div>
      </fieldset>
      {scope === "team" ? (
        <Label><FieldLabel>Team</FieldLabel>
          <Select name="teamId" required defaultValue={teams[0]?.id}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Label>
      ) : (
        <div className="space-y-2">
          <Input placeholder="Filter learners…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter learners" />
          <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
            {shown.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-primary-soft/50">
                <input type="checkbox" checked={selected.has(l.id)} onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(l.id); else next.delete(l.id);
                  setSelected(next);
                }} />
                {l.name}
                <span className="ml-auto text-xs text-muted">{l.teams.join(", ")}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">{selected.size} selected</p>
        </div>
      )}
      <Label hint="Optional"><FieldLabel>Due date</FieldLabel><Input name="dueDate" type="date" min={minDate} /></Label>
      <Button type="submit" disabled={pending || (scope === "users" && selected.size === 0)} className="w-full">
        {pending ? "Assigning…" : "Assign course"}
      </Button>
    </form>
  );
}

export function AssignCourseDialog(props: Parameters<typeof AssignCourseForm>[0] & { scope?: "team" | "users" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus className="size-4" />Assign course</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Assign a course">
        <AssignCourseForm {...props} defaultScope={props.scope ?? "team"} />
      </Dialog>
    </>
  );
}
