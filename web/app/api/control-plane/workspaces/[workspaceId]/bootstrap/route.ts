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

export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } },
) {
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

  const workspaceId = params.workspaceId.trim();
  if (!workspaceId) {
    return Response.json(
      {
        error: {
          code: "invalid_workspace_id",
          message: "workspaceId is required",
        },
      },
      { status: 400 },
    );
  }

  const workspaceContext = await resolveWorkspaceContextForServer();
  const body = await request.text();
  const headers = new Headers({
    accept: "application/json",
    "content-type": request.headers.get("content-type") ?? "application/json",
    "idempotency-key": `web-${crypto.randomUUID()}`,
    "x-authenticated-subject": getAuthenticatedSubject(request, workspaceContext.workspace.subject_id),
    "x-authenticated-roles": getAuthenticatedRoles(request, workspaceContext.workspace.subject_roles),
    "x-workspace-id": workspaceId,
  });

  if (workspaceContext.workspace.workspace_id === workspaceId) {
    headers.set("x-workspace-slug", workspaceContext.workspace.slug);
    headers.set("x-tenant-id", workspaceContext.workspace.tenant_id);
  }

  const upstream = await fetch(`${baseUrl}/api/v1/saas/workspaces/${workspaceId}/bootstrap`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
