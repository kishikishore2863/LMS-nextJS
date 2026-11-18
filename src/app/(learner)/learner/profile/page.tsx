import type { Metadata } from "next";
import { requireUser } from "@/server/auth/permissions";
import { getProfile } from "@/server/services/user.service";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/course/password-form";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Name</dt><dd className="font-medium">{profile.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{profile.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Role</dt><dd>{profile.role.toLowerCase()}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Teams</dt><dd>{profile.teams.map((t) => t.team.name).join(", ") || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Member since</dt><dd>{formatDate(profile.createdAt)}</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Change password" />
          <div className="p-5"><PasswordForm /></div>
        </Card>
      </div>
    </>
  );
}
