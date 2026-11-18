import "server-only";
import { prisma } from "@/lib/prisma";

export const DEFAULT_SETTINGS = {
  platformName: "Learnly LMS",
  allowSelfRegistration: "true",
  defaultPassPct: "70",
  defaultMaxAttempts: "3",
  reminderDaysBeforeDue: "3",
};
export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function saveSettings(values: Partial<Record<SettingKey, string>>) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }),
    ),
  );
}
