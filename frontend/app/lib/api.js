export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function apiRequest(path, options = {}) {
  const { method = "GET", token, body, headers } = options;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  };

  if (token) {
    init.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);
  const contentType = res.headers.get("content-type") || "";
  const hasJson = contentType.includes("application/json");
  const payload = hasJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.error || payload?.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
