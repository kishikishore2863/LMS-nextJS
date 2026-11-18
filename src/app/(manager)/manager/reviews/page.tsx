import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listPendingReviews } from "@/server/services/quiz.service";
import { Card, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { ReviewCard } from "@/components/manager/review-card";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const actor = await requirePermission("review:grade");
  const reviews = await listPendingReviews(actor);
  return (
    <>
      <PageHeader title="Review queue" description={`${reviews.length} quiz attempt${reviews.length === 1 ? "" : "s"} with short answers awaiting a grade.`} />
      {reviews.length === 0 ? (
        <Card><EmptyState title="All caught up" description="Short-answer submissions from your team will appear here." /></Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={{ ...r, createdAt: r.createdAt.toISOString() }} />
          ))}
        </div>
      )}
    </>
  );
}
