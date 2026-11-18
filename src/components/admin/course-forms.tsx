"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Button, FieldLabel, Input, Label, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/components/ui/use-action";
import { createCategoryAction, createCourseAction, deleteCategoryAction } from "@/server/actions/admin.actions";

type Cat = { id: string; name: string };

export function NewCourseDialog({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const { pending, error, exec } = useAction();
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="size-4" />New course</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New course">
        <form
          className="space-y-4"
          action={(fd) =>
            exec(() =>
              createCourseAction({
                title: String(fd.get("title")),
                description: String(fd.get("description") ?? ""),
                categoryId: (fd.get("categoryId") as string) || null,
              }),
            )
          }
        >
          {error && <Alert>{error}</Alert>}
          <Label><FieldLabel>Title</FieldLabel><Input name="title" required minLength={3} /></Label>
          <Label><FieldLabel>Description</FieldLabel><Textarea name="description" rows={3} /></Label>
          <Label><FieldLabel>Category</FieldLabel>
            <Select name="categoryId" defaultValue=""><option value="">Uncategorised</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Label>
          <p className="text-xs text-muted">The course starts as a draft. You’ll add modules and lessons in the builder.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create & open builder"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function CategoryForm() {
  const [name, setName] = useState("");
  const { pending, error, exec } = useAction();
  return (
    <form className="flex flex-wrap gap-2" action={() => exec(() => createCategoryAction(name), () => setName(""))}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="max-w-xs" required minLength={2} aria-label="Category name" />
      <Button type="submit" disabled={pending}>Add</Button>
      {error && <span className="self-center text-sm text-danger">{error}</span>}
    </form>
  );
}

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const { pending, exec } = useAction();
  return (
    <Button variant="ghost" className="px-2 py-1 text-danger" disabled={pending} aria-label={`Delete ${name}`}
      onClick={() => confirm(`Delete category "${name}"? Courses become uncategorised.`) && exec(() => deleteCategoryAction(id))}>
      <Trash2 className="size-4" />
    </Button>
  );
}
