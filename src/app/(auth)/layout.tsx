import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15"><GraduationCap className="size-5" aria-hidden /></span>
          Learnly LMS
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-semibold leading-tight">Learning that keeps the whole team moving.</h2>
          <p className="text-white/80">Admins build courses, managers assign and track, learners grow — one platform, three focused dashboards.</p>
        </div>
        <p className="text-sm text-white/60">© {2026} Learnly</p>
      </div>
      <div className="flex items-center justify-center p-6">{children}</div>
    </div>
  );
}
