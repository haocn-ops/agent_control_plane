import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

function getBaseUrl(): string {
  return (
    process.env.CONTROL_PLANE_BASE_URL ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ??
    ""
  ).replace(/\/$/, "");
}

function getSubjectId(): string {
  return (
    process.env.CONTROL_PLANE_SUBJECT_ID ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_SUBJECT_ID ??
    "codex@local"
  );
}

function getSubjectRoles(): string {
  return (
    process.env.CONTROL_PLANE_SUBJECT_ROLES ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_SUBJECT_ROLES ??
    "platform_admin"
  );
}

export async function proxyControlPlane(
  path: string,
  options?: { includeTenant?: boolean; init?: RequestInit },
): Promise<Response> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Response.json(
      {
        error: {
          code: "control_plane_base_missing",
          message: "CONTROL_PLANE_BASE_URL is not configured"
        }
      },
      { status: 503 },
    );
  }

  const workspaceContext = await resolveWorkspaceContextForServer();
  const headers = new Headers({
    accept: "application/json",
    "x-authenticated-subject": workspaceContext.workspace.subject_id ?? getSubjectId(),
    "x-authenticated-roles": workspaceContext.workspace.subject_roles ?? getSubjectRoles(),
    "x-workspace-id": workspaceContext.workspace.workspace_id,
    "x-workspace-slug": workspaceContext.workspace.slug,
  });

  if (options?.includeTenant !== false) {
    headers.set("x-tenant-id", workspaceContext.workspace.tenant_id);
  }

  const upstreamHeaders = new Headers(headers);
  if (options?.init?.headers) {
    const extraHeaders = new Headers(options.init.headers);
    extraHeaders.forEach((value, key) => {
      upstreamHeaders.set(key, value);
    });
  }

  const upstream = await fetch(`${baseUrl}${path}`, {
    ...(options?.init ?? {}),
    headers: upstreamHeaders,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}

export async function proxyControlPlaneOrFallback<T>(
  path: string,
  fallbackData: T,
  options?: { includeTenant?: boolean; init?: RequestInit },
): Promise<Response> {
  const upstream = await proxyControlPlane(path, options);
  if (upstream.ok) {
    return upstream;
  }

  return Response.json({
    data: fallbackData,
    meta: {
      request_id: "preview-request",
      trace_id: "preview-trace"
    }
  });
}
