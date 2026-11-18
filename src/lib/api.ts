import "server-only";
import { NextResponse, connection } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, ValidationError } from "./errors";

/** Response shape from section 6: { data, meta? } or { error: { code, message } }. */
export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status });
}

export function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return fail("validation", err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "), 400);
  }
  if (err instanceof AppError) return fail(err.code, err.message, err.status);
  console.error(err);
  return fail("internal", "Something went wrong", 500);
}

/** Wraps a route handler so thrown AppErrors / ZodErrors become typed JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    // API responses are per-request; never prerender them. Must stay outside the
    // try block so the prerender bail-out isn't swallowed as an error response.
    await connection();
    try {
      return await fn(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Body must be valid JSON");
  }
  return schema.parse(body);
}
