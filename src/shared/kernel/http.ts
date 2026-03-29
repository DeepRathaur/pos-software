import { NextResponse } from "next/server";

/** Structured API errors with HTTP status (checkout, stock, etc.) */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, status: init?.status ?? 200 });
}

export function jsonError(message: string, status = 400, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
}

/**
 * Read and parse JSON body. Use in Route Handlers only (consumes the body stream once).
 */
export async function parseJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text.trim()) {
    throw new HttpError("Request body is required", 400, "EMPTY_BODY");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError("Invalid JSON", 400, "INVALID_JSON");
  }
}
