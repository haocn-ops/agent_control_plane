import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  return (
    process.env.CONTROL_PLANE_BASE_URL ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ??
    ""
  ).replace(/\/$/, "");
}

function getAuthenticatedSubject(request: Request, fallbackSubjectId?: string): string {
  return (
    request.headers.get("x-authenticated-subject") ??
    request.headers.get("cf-access-authenticated-user-email") ??
    fallbackSubjectId ??
    "codex@local"
  );
}

function getAuthenticatedRoles(request: Request, fallbackRoles?: string): string {
  return (
    request.headers.get("x-authenticated-roles") ??
    request.headers.get("cf-access-authenticated-user-groups") ??
    fallbackRoles ??
    "platform_admin"
  );
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Response.json(
      {
        error: {
          code: "control_plane_base_missing",
          message: "CONTROL_PLANE_BASE_URL is not configured",
        },
      },
      { status: 503 },
    );
  }

  const workspaceContext = await resolveWorkspaceContextForServer();
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `${baseUrl}/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/audit-events:export`,
  );
  requestUrl.searchParams.forEach((value, key) => {
    if (value.trim() !== "") {
      upstreamUrl.searchParams.set(key, value);
    }
  });

  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers: {
      accept: request.headers.get("accept") ?? "application/json, application/x-ndjson",
      "x-authenticated-subject": getAuthenticatedSubject(request, workspaceContext.workspace.subject_id),
      "x-authenticated-roles": getAuthenticatedRoles(request, workspaceContext.workspace.subject_roles),
      "x-workspace-id": workspaceContext.workspace.workspace_id,
      "x-workspace-slug": workspaceContext.workspace.slug,
      "x-tenant-id": workspaceContext.workspace.tenant_id,
    },
    cache: "no-store",
  });

  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") ?? "application/octet-stream");
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
