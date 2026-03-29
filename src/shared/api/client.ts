export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pos_token");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: unknown,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseJsonSafe(text: string, httpStatus: number): unknown {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    throw new ApiError("Invalid response from server", httpStatus);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const token = init.token ?? getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network request failed";
    throw new ApiError(msg, 0, undefined, "NETWORK_ERROR");
  }

  const text = await res.text();
  const data = parseJsonSafe(text, res.status) as Record<string, unknown> | null;

  if (!res.ok) {
    const msg =
      (typeof data?.error === "string" && data.error) ||
      res.statusText ||
      "Request failed";
    const issues = data?.issues;
    const code = typeof data?.code === "string" ? data.code : undefined;
    throw new ApiError(msg, res.status, issues, code);
  }

  return data as T;
}
