const encoder = new TextEncoder();

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  return `${prefix}_${timestamp}${entropy}`;
}

export async function hashPayload(value: unknown): Promise<string> {
  const canonical = stableJsonStringify(value);
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }

  return value;
}
