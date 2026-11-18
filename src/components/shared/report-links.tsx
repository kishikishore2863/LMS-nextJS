import { Download } from "lucide-react";
import { Card } from "@/components/ui";

const REPORTS = [
  { type: "team-progress", title: "Team progress", desc: "Every enrolment with status, progress, due and completion dates." },
  { type: "course-summary", title: "Course summary", desc: "Enrolments, completions and average progress per course." },
  { type: "quiz-results", title: "Quiz results", desc: "All quiz attempts with scores and review state." },
];

export function ReportLinks({ scope }: { scope: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {REPORTS.map((r) => (
        <Card key={r.type} className="flex flex-col p-5">
          <h2 className="font-semibold">{r.title}</h2>
          <p className="mt-1 flex-1 text-sm text-muted">{r.desc}</p>
          <p className="mt-3 text-xs text-muted">Scope: {scope}</p>
          <a href={`/api/reports/export?type=${r.type}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary" download>
            <Download className="size-4" />Download CSV
          </a>
        </Card>
      ))}
    </div>
  );
}
