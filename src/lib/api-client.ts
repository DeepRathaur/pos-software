export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pos_token");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const token = init.token ?? getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText ?? "Request failed";
    throw new Error(msg);
  }
  return data as T;
}
