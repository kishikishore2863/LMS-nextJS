import "server-only";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/** Runs a mutation and converts thrown errors into a serialisable result for client forms. */
export async function run<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: err.issues.map((i) => i.message).join("; ") };
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong" };
  }
}
