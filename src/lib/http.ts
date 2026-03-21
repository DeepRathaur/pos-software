import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, status: init?.status ?? 200 });
}

export function jsonError(message: string, status = 400, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
}

export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Validation failed", 422, {
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  if (err instanceof Error) {
    if (err.message === "Unauthorized") return jsonError(err.message, 401);
    if (err.message === "Forbidden") return jsonError(err.message, 403);
    if (err.message === "Not found") return jsonError(err.message, 404);
    if (err.message === "Invalid JSON body") return jsonError(err.message, 400);
    return jsonError(err.message, 400);
  }
  return jsonError("Internal server error", 500);
}
