import { getAdminToken } from "../utils/adminAuth";
import type { ApiErrorBody } from "../types";

export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Resolve an image URL coming from the API/form input into something a
 * browser <img> can load: absolute http(s)/data URLs pass through, and
 * backend-relative paths (e.g. "/uploads/x.png") get the API origin prefixed.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return "/no-image.png";
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  if (url === "/no-image.png") return url;
  if (url.startsWith("/")) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
}

function authHeader(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** GET a JSON resource. Pass `admin: true` to attach the admin bearer token. */
export async function apiGet<T>(path: string, opts: { admin?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: opts.admin ? authHeader() : undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) {
    throw new Error((data as ApiErrorBody)?.message || `API error: ${res.status}`);
  }
  return data as T;
}

/** POST/PUT/PATCH/DELETE a JSON resource. Pass `admin: true` to attach the admin bearer token. */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  opts: { admin?: boolean } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.admin ? authHeader() : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) {
    throw new Error((data as ApiErrorBody)?.message || `API error: ${res.status}`);
  }
  return data as T;
}
