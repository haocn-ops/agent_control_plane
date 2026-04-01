import { ApiError } from "./http.js";

export function resolveAuthHeaders(env: Env, authRef?: string | null): Headers {
  const headers = new Headers();
  if (!authRef || authRef.trim() === "") {
    return headers;
  }

  const trimmed = authRef.trim();
  if (trimmed.startsWith("bearer:")) {
    const bindingName = trimmed.slice("bearer:".length).trim();
    headers.set("authorization", `Bearer ${readSecretBinding(env, bindingName)}`);
    return headers;
  }

  if (trimmed.startsWith("header:")) {
    const [, headerName, ...bindingParts] = trimmed.split(":");
    const bindingName = bindingParts.join(":").trim();
    if (!headerName || !bindingName) {
      throw new ApiError(
        500,
        "upstream_auth_invalid",
        "auth_ref must use header:<Header-Name>:<SecretBindingName> format",
      );
    }
    headers.set(headerName, readSecretBinding(env, bindingName));
    return headers;
  }

  headers.set("authorization", `Bearer ${readSecretBinding(env, trimmed)}`);
  return headers;
}

function readSecretBinding(env: Env, bindingName: string): string {
  if (bindingName === "") {
    throw new ApiError(500, "upstream_auth_invalid", "auth_ref secret binding name must not be empty");
  }

  const secretValue = ((env as unknown) as Record<string, unknown>)[bindingName];
  if (typeof secretValue !== "string" || secretValue.trim() === "") {
    throw new ApiError(
      500,
      "upstream_auth_not_configured",
      `Secret binding ${bindingName} is not configured on this Worker environment`,
    );
  }

  return secretValue;
}
