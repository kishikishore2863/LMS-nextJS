"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { ROLE_HOME, canAccessPath } from "@/server/auth/roles";
import { signIn, signOut } from "@/server/auth/auth";
import { loginSchema, registerSchema } from "@/lib/validators";
import { getRoleByEmail, registerUser } from "@/server/services/user.service";
import { getSettings } from "@/server/services/settings.service";
import { AppError } from "@/lib/errors";

export type AuthFormState = { error?: string } | undefined;

function safeCallback(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password" };
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email or password" };
    throw err;
  }
  // Land on the role's dashboard (or the page that sent them to login, if their role may open it).
  const role = await getRoleByEmail(parsed.data.email);
  const callback = safeCallback(formData.get("callbackUrl"));
  redirect(callback !== "/" && canAccessPath(role, callback) ? callback : ROLE_HOME[role]);
}

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const settings = await getSettings();
  if (settings.allowSelfRegistration !== "true") return { error: "Self-registration is disabled. Ask an admin for an account." };
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await registerUser(parsed.data);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/learner" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Account created — please sign in" };
    throw err;
  }
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
