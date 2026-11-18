"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileText,
  GripVertical,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, FieldLabel, Input, Label, Select, Textarea, type Tone } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/components/ui/use-action";
import {
  addLessonAction,
  addModuleAction,
  addQuestionAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  deleteQuestionAction,
  renameModuleAction,
  reorderLessonsAction,
  reorderModulesAction,
  updateCourseAction,
  updateLessonAction,
  updateQuizSettingsAction,
} from "@/server/actions/admin.actions";

type LessonType = "VIDEO" | "PDF" | "TEXT" | "QUIZ";
type Question = { id: string; text: string; type: string; options: string[]; answer: unknown; points: number };
type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  contentUrl: string | null;
  body: string | null;
  durationSec: number;
  quiz: { id: string; passPct: number; maxAttempts: number; questions: Question[] } | null;
};
type Mod = { id: string; title: string; lessons: Lesson[] };
type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string | null;
  categoryId: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  durationMin: number;
  modules: Mod[];
};

const TYPE_ICON = { VIDEO: Video, PDF: FileText, TEXT: FileText, QUIZ: HelpCircle };
const STATUS_TONE: Record<Course["status"], Tone> = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" };

function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function CourseBuilder({ course, categories }: { course: Course; categories: { id: string; name: string }[] }) {
  const status = useAction();
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/courses" className="text-sm text-muted hover:text-foreground">← Courses</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {course.title} <Badge tone={STATUS_TONE[course.status]}>{course.status.toLowerCase()}</Badge>
          </h1>
          <p className="mt-1 text-sm text-muted">{course.modules.length} modules · {lessonCount} lessons · {course.durationMin} min</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {course.status === "PUBLISHED" && (
            <Link href={`/learner/courses/${course.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm hover:bg-primary-soft">
              <Eye className="size-4" />View as learner
            </Link>
          )}
          {course.status !== "PUBLISHED" && (
            <Button disabled={status.pending} onClick={() => status.exec(() => updateCourseAction(course.id, { status: "PUBLISHED" }))}>Publish</Button>
          )}
          {course.status === "PUBLISHED" && (
            <Button variant="secondary" disabled={status.pending} onClick={() => confirm("Archive this course? Learners keep their history but it leaves the catalogue.") && status.exec(() => updateCourseAction(course.id, { status: "ARCHIVED" }))}>
              Archive
            </Button>
          )}
          {course.status === "ARCHIVED" && (
            <Button variant="secondary" disabled={status.pending} onClick={() => status.exec(() => updateCourseAction(course.id, { status: "DRAFT" }))}>Move to draft</Button>
          )}
          {course.status !== "PUBLISHED" && (
            <Button variant="ghost" className="text-danger" disabled={status.pending} onClick={() => confirm("Delete this course permanently?") && status.exec(() => deleteCourseAction(course.id))}>
              <Trash2 className="size-4" />Delete
            </Button>
          )}
        </div>
      </div>
      {status.error && <Alert>{status.error}</Alert>}
      {status.message && <Alert tone="success">{status.message}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4 xl:order-1">
          <ModuleList course={course} />
        </div>
        <div className="xl:order-2">
          <DetailsForm course={course} categories={categories} />
        </div>
      </div>
    </div>
  );
}

function DetailsForm({ course, categories }: { course: Course; categories: { id: string; name: string }[] }) {
  const { pending, error, message, exec } = useAction();
  return (
    <Card>
      <CardHeader title="Course details" />
      <form
        className="space-y-4 p-5"
        action={(fd) =>
          exec(() =>
            updateCourseAction(course.id, {
              title: String(fd.get("title")),
              description: String(fd.get("description") ?? ""),
              categoryId: (fd.get("categoryId") as string) || null,
              thumbnail: (fd.get("thumbnail") as string) || "",
            }),
          )
        }
      >
        {error && <Alert>{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <Label><FieldLabel>Title</FieldLabel><Input name="title" defaultValue={course.title} required minLength={3} /></Label>
        <Label><FieldLabel>Description</FieldLabel><Textarea name="description" defaultValue={course.description} rows={4} /></Label>
        <Label><FieldLabel>Category</FieldLabel>
          <Select name="categoryId" defaultValue={course.categoryId ?? ""}>
            <option value="">Uncategorised</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Label>
        <Label hint="Optional image URL"><FieldLabel>Thumbnail</FieldLabel><Input name="thumbnail" type="url" defaultValue={course.thumbnail ?? ""} /></Label>
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Saving…" : "Save details"}</Button>
      </form>
    </Card>
  );
}

// ---------------- Modules ----------------

function ModuleList({ course }: { course: Course }) {
  const [modules, setModules] = useState(course.modules);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [prevModules, setPrevModules] = useState(course.modules);
  const { pending, error, exec } = useAction();
  if (course.modules !== prevModules) {
    // Server data refreshed after a mutation: adopt it (derived-state pattern, no effect).
    setPrevModules(course.modules);
    setModules(course.modules);
  }

  const persist = (next: Mod[]) => {
    setModules(next);
    exec(() => reorderModulesAction(course.id, next.map((m) => m.id)));
  };

  return (
    <>
      {error && <Alert>{error}</Alert>}
      {modules.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">No modules yet — add the first one below.</Card>
      )}
      {modules.map((m, i) => (
        <div
          key={m.id}
          draggable
          onDragStart={(e: DragEvent) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/module", m.id); }}
          onDragOver={(e) => { if (dragIdx !== null) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) persist(move(modules, dragIdx, i)); setDragIdx(null); }}
          onDragEnd={() => setDragIdx(null)}
          className={dragIdx === i ? "opacity-50" : undefined}
        >
          <ModuleCard
            mod={m}
            index={i}
            canUp={i > 0}
            canDown={i < modules.length - 1}
            onMove={(dir) => persist(move(modules, i, i + dir))}
          />
        </div>
      ))}
      <Card className="p-4">
        <form className="flex gap-2" action={() => exec(() => addModuleAction(course.id, title), () => setTitle(""))}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New module title" required aria-label="New module title" />
          <Button type="submit" disabled={pending}><Plus className="size-4" />Add module</Button>
        </form>
      </Card>
    </>
  );
}

function ModuleCard({ mod, index, canUp, canDown, onMove }: { mod: Mod; index: number; canUp: boolean; canDown: boolean; onMove: (d: -1 | 1) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [lessons, setLessons] = useState(mod.lessons);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [prevLessons, setPrevLessons] = useState(mod.lessons);
  const { pending, error, exec } = useAction();
  if (mod.lessons !== prevLessons) {
    setPrevLessons(mod.lessons);
    setLessons(mod.lessons);
  }

  const persist = (next: Lesson[]) => {
    setLessons(next);
    exec(() => reorderLessonsAction(mod.id, next.map((l) => l.id)));
  };

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <GripVertical className="size-4 cursor-grab text-muted" aria-hidden />
        <span className="text-xs font-medium text-muted">Module {index + 1}</span>
        {editing ? (
          <form className="flex flex-1 gap-2" action={() => exec(() => renameModuleAction(mod.id, title), () => setEditing(false))}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="py-1" autoFocus aria-label="Module title" />
            <Button type="submit" className="py-1" disabled={pending}>Save</Button>
          </form>
        ) : (
          <h3 className="flex-1 font-semibold">{mod.title}</h3>
        )}
        <div className="flex items-center">
          <Button variant="ghost" className="px-1.5 py-1" disabled={!canUp} onClick={() => onMove(-1)} aria-label="Move module up"><ArrowUp className="size-4" /></Button>
          <Button variant="ghost" className="px-1.5 py-1" disabled={!canDown} onClick={() => onMove(1)} aria-label="Move module down"><ArrowDown className="size-4" /></Button>
          <Button variant="ghost" className="px-1.5 py-1" onClick={() => setEditing((e) => !e)} aria-label="Rename module"><Pencil className="size-4" /></Button>
          <Button variant="ghost" className="px-1.5 py-1 text-danger" disabled={pending}
            onClick={() => confirm(`Delete module "${mod.title}" and its lessons?`) && exec(() => deleteModuleAction(mod.id))} aria-label="Delete module">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {error && <div className="px-4 pt-3"><Alert>{error}</Alert></div>}
      <ul>
        {lessons.map((l, i) => {
          const Icon = TYPE_ICON[l.type];
          return (
            <li
              key={l.id}
              draggable
              onDragStart={(e) => { e.stopPropagation(); setDragIdx(i); }}
              onDragOver={(e) => { if (dragIdx !== null) { e.preventDefault(); e.stopPropagation(); } }}
              onDrop={(e) => { if (dragIdx === null) return; e.preventDefault(); e.stopPropagation(); if (dragIdx !== i) persist(move(lessons, dragIdx, i)); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 ${dragIdx === i ? "opacity-50" : ""}`}
            >
              <GripVertical className="size-4 cursor-grab text-muted" aria-hidden />
              <Icon className="size-4 text-primary" aria-hidden />
              <span className="flex-1 text-sm">{l.title}</span>
              {l.type === "QUIZ" && (
                <Badge tone={l.quiz?.questions.length ? "primary" : "danger"}>{l.quiz?.questions.length ?? 0} questions</Badge>
              )}
              <span className="hidden text-xs text-muted sm:inline">{Math.round(l.durationSec / 60)} min</span>
              <Button variant="ghost" className="px-1.5 py-1" disabled={i === 0} onClick={() => persist(move(lessons, i, i - 1))} aria-label="Move lesson up"><ArrowUp className="size-3.5" /></Button>
              <Button variant="ghost" className="px-1.5 py-1" disabled={i === lessons.length - 1} onClick={() => persist(move(lessons, i, i + 1))} aria-label="Move lesson down"><ArrowDown className="size-3.5" /></Button>
              <LessonDialog moduleId={mod.id} lesson={l} />
              <Button variant="ghost" className="px-1.5 py-1 text-danger" onClick={() => confirm(`Delete lesson "${l.title}"?`) && exec(() => deleteLessonAction(l.id))} aria-label="Delete lesson">
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-4 py-3">
        <LessonDialog moduleId={mod.id} />
      </div>
    </Card>
  );
}

// ---------------- Lessons ----------------

async function uploadFile(file: File): Promise<string> {
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  }).then((r) => r.json());
  if (presign.error) throw new Error(presign.error.message);
  const put = await fetch(presign.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("Upload failed");
  return presign.data.fileUrl as string;
}

function LessonDialog({ moduleId, lesson }: { moduleId: string; lesson?: Lesson }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LessonType>(lesson?.type ?? "VIDEO");
  const [contentUrl, setContentUrl] = useState(lesson?.contentUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const { pending, error, exec, setError } = useAction();

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setContentUrl(await uploadFile(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {lesson ? (
        <Button variant="ghost" className="px-1.5 py-1" onClick={() => setOpen(true)} aria-label={`Edit ${lesson.title}`}><Pencil className="size-3.5" /></Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}><Plus className="size-4" />Add lesson</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={lesson ? `Edit lesson` : "Add lesson"} wide>
        <form
          className="space-y-4"
          action={(fd) => {
            const input = {
              title: String(fd.get("title")),
              type,
              contentUrl: contentUrl || null,
              body: (fd.get("body") as string) || null,
              durationSec: Math.round(Number(fd.get("durationMin") || 0) * 60),
            };
            exec(() => (lesson ? updateLessonAction(lesson.id, input) : addLessonAction(moduleId, input)), () => !lesson && setOpen(false));
          }}
        >
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px]">
            <Label><FieldLabel>Title</FieldLabel><Input name="title" defaultValue={lesson?.title} required /></Label>
            <Label><FieldLabel>Type</FieldLabel>
              <Select value={type} onChange={(e) => setType(e.target.value as LessonType)} disabled={lesson?.type === "QUIZ"}>
                <option value="VIDEO">Video</option><option value="PDF">PDF</option><option value="TEXT">Text</option><option value="QUIZ">Quiz</option>
              </Select>
            </Label>
            <Label><FieldLabel>Minutes</FieldLabel><Input name="durationMin" type="number" min={0} step="0.5" defaultValue={lesson ? lesson.durationSec / 60 : 5} /></Label>
          </div>
          {(type === "VIDEO" || type === "PDF") && (
            <div className="space-y-2">
              <Label hint={type === "VIDEO" ? "MP4/WebM URL or an uploaded file" : "PDF URL or an uploaded file"}>
                <FieldLabel>Content URL</FieldLabel>
                <Input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://…" />
              </Label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                <Upload className="size-4" />{uploading ? "Uploading…" : "Upload file"}
                <input type="file" className="sr-only" accept={type === "VIDEO" ? "video/mp4,video/webm" : "application/pdf"} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
          )}
          {(type === "TEXT" || type === "VIDEO") && (
            <Label hint={type === "VIDEO" ? "Optional transcript / notes (shown under the video for accessibility)" : "Blank lines start a new paragraph"}>
              <FieldLabel>{type === "TEXT" ? "Content" : "Transcript"}</FieldLabel>
              <Textarea name="body" rows={type === "TEXT" ? 10 : 4} defaultValue={lesson?.body ?? ""} required={type === "TEXT"} />
            </Label>
          )}
          {type === "QUIZ" && !lesson && <p className="text-sm text-muted">Save the lesson, then edit it to add questions.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save lesson"}</Button>
          </div>
        </form>
        {lesson?.quiz && <QuizEditor quiz={lesson.quiz} />}
      </Dialog>
    </>
  );
}

// ---------------- Quiz ----------------

function QuizEditor({ quiz }: { quiz: NonNullable<Lesson["quiz"]> }) {
  const settings = useAction();
  const q = useAction();
  const [qType, setQType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT">("MCQ");
  const [options, setOptions] = useState(["", ""]);
  const [correct, setCorrect] = useState(0);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="mt-6 space-y-5 border-t border-border pt-5">
      <h3 className="font-semibold">Quiz</h3>
      <form
        className="flex flex-wrap items-end gap-3"
        action={(fd) => settings.exec(() => updateQuizSettingsAction(quiz.id, { passPct: Number(fd.get("passPct")), maxAttempts: Number(fd.get("maxAttempts")) }))}
      >
        <Label><FieldLabel>Pass mark %</FieldLabel><Input name="passPct" type="number" min={1} max={100} defaultValue={quiz.passPct} className="w-28" /></Label>
        <Label><FieldLabel>Max attempts</FieldLabel><Input name="maxAttempts" type="number" min={1} max={20} defaultValue={quiz.maxAttempts} className="w-28" /></Label>
        <Button type="submit" variant="secondary" disabled={settings.pending}>Save settings</Button>
        {settings.message && <span className="text-sm text-success">{settings.message}</span>}
        {settings.error && <span className="text-sm text-danger">{settings.error}</span>}
      </form>

      <ol className="space-y-2">
        {quiz.questions.map((question, i) => (
          <li key={question.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-medium">{i + 1}.</span>
              <div className="flex-1">
                <p>{question.text}</p>
                <p className="mt-1 text-xs text-muted">
                  {question.type === "MCQ" && <>Options: {question.options.map((o, j) => <span key={j} className={j === Number(question.answer) ? "font-semibold text-success" : ""}>{o}{j < question.options.length - 1 ? " · " : ""}</span>)}</>}
                  {question.type === "TRUE_FALSE" && <>True/false — answer: <span className="font-semibold text-success">{String(question.answer)}</span></>}
                  {question.type === "SHORT" && <>Short answer — manually reviewed</>}
                  {" "}· {question.points} pt
                </p>
              </div>
              <Button variant="ghost" className="px-1.5 py-1 text-danger" onClick={() => q.exec(() => deleteQuestionAction(question.id))} aria-label="Delete question"><Trash2 className="size-3.5" /></Button>
            </div>
          </li>
        ))}
        {quiz.questions.length === 0 && <li className="text-sm text-muted">No questions yet.</li>}
      </ol>

      <form
        key={formKey}
        className="space-y-3 rounded-lg border border-dashed border-border p-4"
        action={(fd) =>
          q.exec(
            () =>
              addQuestionAction(quiz.id, {
                text: String(fd.get("text")),
                type: qType,
                options: qType === "MCQ" ? options.filter(Boolean) : [],
                answer: qType === "MCQ" ? correct : qType === "TRUE_FALSE" ? fd.get("tf") === "true" : String(fd.get("guide") ?? ""),
                points: Number(fd.get("points") || 1),
              }),
            () => { setOptions(["", ""]); setCorrect(0); setFormKey((k) => k + 1); },
          )
        }
      >
        <div className="text-sm font-medium">Add question</div>
        {q.error && <Alert>{q.error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_90px]">
          <Input name="text" placeholder="Question text" required aria-label="Question text" />
          <Select value={qType} onChange={(e) => setQType(e.target.value as typeof qType)} aria-label="Question type">
            <option value="MCQ">Multiple choice</option><option value="TRUE_FALSE">True / false</option><option value="SHORT">Short answer</option>
          </Select>
          <Input name="points" type="number" min={1} defaultValue={1} aria-label="Points" />
        </div>
        {qType === "MCQ" && (
          <fieldset className="space-y-2">
            <legend className="text-xs text-muted">Options — select the correct one</legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Option ${i + 1} is correct`} />
                <Input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} required className="py-1" />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" className="px-1.5 py-1" onClick={() => { setOptions(options.filter((_, j) => j !== i)); setCorrect(0); }} aria-label="Remove option"><Trash2 className="size-3.5" /></Button>
                )}
              </div>
            ))}
            {options.length < 6 && <Button type="button" variant="ghost" className="py-1 text-primary" onClick={() => setOptions([...options, ""])}><Plus className="size-3.5" />Option</Button>}
          </fieldset>
        )}
        {qType === "TRUE_FALSE" && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="tf" value="true" defaultChecked />True</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="tf" value="false" />False</label>
          </div>
        )}
        {qType === "SHORT" && <Textarea name="guide" rows={2} placeholder="Marking guide for reviewers (not shown to learners)" />}
        <Button type="submit" disabled={q.pending}><Plus className="size-4" />Add question</Button>
      </form>
    </div>
  );
}
