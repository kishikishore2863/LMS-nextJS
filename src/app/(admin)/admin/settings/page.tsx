import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { getSettings } from "@/server/services/settings.service";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings:manage");
  const values = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide configuration." />
      <Card className="p-6"><SettingsForm values={values} /></Card>
    </>
  );
}
