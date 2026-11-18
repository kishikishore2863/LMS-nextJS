"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Alert, Button, ButtonLink, Card } from "@/components/ui";

type Lesson = { id: string; type: "VIDEO" | "PDF" | "TEXT" | "QUIZ"; contentUrl: string | null; body: string | null; durationSec: number; quizId: string | null };

const SAVE_EVERY_MS = 15_000;

/**
 * Plays a lesson and reports progress to /api/progress
 * (every 15 s while playing, on pause/leave, and with completed: true at the end).
 */
export function LessonPlayer({ lesson, startAt, completed, nextHref }: { lesson: Lesson; startAt: number; completed: boolean; nextHref: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onProgress = useCallback(
    async (position: number, isComplete = false, keepalive = false) => {
      lastSent.current = Date.now();
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: lesson.id, position: Math.floor(position), completed: isComplete }),
          keepalive,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Could not save progress");
        }
        if (isComplete) {
          setDone(true);
          router.refresh();
        }
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [lesson.id, router],
  );

  // Video: resume at startAt, periodic saves, save on leave.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || lesson.type !== "VIDEO") return;
    const onLoaded = () => {
      if (startAt > 0 && startAt < (v.duration || Infinity) - 2) v.currentTime = startAt;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    const timer = setInterval(() => {
      if (!v.paused && Date.now() - lastSent.current >= SAVE_EVERY_MS) void onProgress(v.currentTime);
    }, 1000);
    const flush = () => v.currentTime > 0 && void onProgress(v.currentTime, false, true);
    window.addEventListener("pagehide", flush);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [lesson.type, startAt, onProgress]);

  const markComplete = async () => {
    setSaving(true);
    await onProgress(lesson.type === "VIDEO" ? (videoRef.current?.currentTime ?? 0) : 0, true);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}

      {lesson.type === "VIDEO" && (
        <Card className="overflow-hidden">
          {lesson.contentUrl ? (
            <video
              ref={videoRef}
              src={lesson.contentUrl}
              controls
              playsInline
              className="aspect-video w-full bg-black"
              onPause={(e) => void onProgress(e.currentTarget.currentTime)}
              onEnded={(e) => void onProgress(e.currentTarget.duration || e.currentTarget.currentTime, true)}
            />
          ) : (
            <p className="p-8 text-center text-sm text-muted">Video not available yet.</p>
          )}
          {lesson.body && (
            <details className="border-t border-border p-4 text-sm">
              <summary className="cursor-pointer font-medium">Transcript</summary>
              <div className="prose-lesson mt-3 text-muted">{lesson.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
            </details>
          )}
        </Card>
      )}

      {lesson.type === "PDF" && (
        <Card className="overflow-hidden">
          {lesson.contentUrl ? (
            <>
              <iframe src={lesson.contentUrl} title="Lesson PDF" className="h-[70vh] w-full bg-white" />
              <div className="border-t border-border p-3 text-right text-sm">
                <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="text-primary">Open PDF in new tab</a>
              </div>
            </>
          ) : (
            <p className="p-8 text-center text-sm text-muted">PDF not available yet.</p>
          )}
        </Card>
      )}

      {lesson.type === "TEXT" && (
        <Card className="prose-lesson p-6 text-[15px]">
          {(lesson.body ?? "").split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </Card>
      )}

      {lesson.type === "QUIZ" && (
        <Card className="flex flex-wrap items-center gap-4 p-6">
          <HelpCircle className="size-8 text-primary" aria-hidden />
          <div className="flex-1">
            <h2 className="font-semibold">Knowledge check</h2>
            <p className="text-sm text-muted">Pass the quiz to complete this lesson.</p>
          </div>
          {lesson.quizId && <ButtonLink href={`/learner/quiz/${lesson.quizId}`}>{done ? "Review quiz" : "Start quiz"}</ButtonLink>}
        </Card>
      )}

      {lesson.type !== "QUIZ" && (
        <div className="flex flex-wrap items-center gap-3">
          {done ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" />Lesson completed</span>
              <Link href={nextHref} className="text-sm text-primary">Continue →</Link>
            </>
          ) : (
            <Button onClick={markComplete} disabled={saving}>{saving ? "Saving…" : "Mark as complete"}</Button>
          )}
        </div>
      )}
    </div>
  );
}
