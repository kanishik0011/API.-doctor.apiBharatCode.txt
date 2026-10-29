import type { ApiCase } from "@/lib/types";

const SECRET_KEYS = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password|passwd)$/i;
const AUTH_SECRET = /\b((?:bearer|basic)\s+)([a-z0-9._~+\/=\-]+)/gi;
const INLINE_SECRETS = /((?:api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password|passwd)\s*[=:]\s*)[^\s,;"'}&]+/gi;
const JSON_SECRET = /(["'](?:api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password|passwd)["']\s*:\s*["'])[^"']*(["'])/gi;
const QUERY_SECRET = /([?&](?:api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password|passwd)=)[^&#\s]*/gi;

function redactUnknown(value: unknown, key = ""): unknown {
  if (SECRET_KEYS.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactUnknown(entryValue, entryKey)]));
  if (typeof value === "string") return redactPlainText(value);
  return value;
}

function redactPlainText(value: string): string {
  return value
    .replace(AUTH_SECRET, (match, prefix: string, candidate: string) => {
      const genericTerms = new Set(["token", "credential", "credentials", "authentication", "authorization", "scheme", "header", "value"]);
      const normalized = candidate.toLowerCase().replace(/\.+$/, "");
      return genericTerms.has(normalized) ? match : `${prefix}[REDACTED]`;
    })
    .replace(INLINE_SECRETS, (_match, keyPrefix: string | undefined) => `${keyPrefix || ""}[REDACTED]`)
    .replace(JSON_SECRET, "$1[REDACTED]$2")
    .replace(QUERY_SECRET, "$1[REDACTED]");
}

export function redactText(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try { return JSON.stringify(redactUnknown(JSON.parse(trimmed))); }
    catch { /* fall through to log/text redaction */ }
  }
  return redactPlainText(value);
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (SECRET_KEYS.test(key)) url.searchParams.set(key, "[REDACTED]");
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    return url.toString();
  } catch { return redactPlainText(value); }
}

export function sanitizeRequest<T extends { url: string; headers: Array<{ key: string; value: string }>; body: string }>(request: T): T {
  return {
    ...request,
    url: sanitizeUrl(request.url),
    headers: request.headers.map((header) => ({ key: header.key, value: SECRET_KEYS.test(header.key) ? "[REDACTED]" : redactText(header.value) })),
    body: redactText(request.body),
  };
}

export function sanitizeApiCase(apiCase: ApiCase): ApiCase {
  return {
    ...sanitizeRequest(apiCase),
    responseBody: redactText(apiCase.responseBody),
    logs: redactText(apiCase.logs),
  };
}

export function sanitizeGeneratedValue<T>(value: T): T {
  return redactUnknown(value) as T;
}
