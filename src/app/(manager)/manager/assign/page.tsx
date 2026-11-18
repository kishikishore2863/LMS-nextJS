import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { assignOptions } from "@/server/services/assign-options";
import { Card, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { AssignCourseForm } from "@/components/manager/assign-course-dialog";

export const metadata: Metadata = { title: "Assign course" };

export default async function AssignPage() {
  const actor = await requirePermission("assignment:create");
  const options = await assignOptions(actor);
  return (
    <>
      <PageHeader title="Assign a course" description="Learners are notified by email and in-app. Re-assigning updates the due date." />
      <Card className="max-w-xl p-6">
        {options.teams.length === 0 ? (
          <EmptyState title="You don't manage any teams yet" description="Ask an admin to add you as a manager of a team." />
        ) : (
          <AssignCourseForm {...options} />
        )}
      </Card>
    </>
  );
}
