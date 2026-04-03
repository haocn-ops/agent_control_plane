import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  return (
    process.env.CONTROL_PLANE_BASE_URL ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ??
    ""
  ).replace(/\/$/, "");
}

export async function POST(
  request: Request,
  { params }: { params: { apiKeyId: string } },
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

  const { apiKeyId } = params;
  const workspaceContext = await resolveWorkspaceContextForServer();
  const body = await request.text();
  const upstream = await fetch(
    `${baseUrl}/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/api-keys/${apiKeyId}:rotate`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "idempotency-key": `web-${crypto.randomUUID()}`,
        "x-authenticated-subject": workspaceContext.workspace.subject_id ?? "codex@local",
        "x-authenticated-roles": workspaceContext.workspace.subject_roles ?? "platform_admin",
        "x-workspace-id": workspaceContext.workspace.workspace_id,
        "x-workspace-slug": workspaceContext.workspace.slug,
        "x-tenant-id": workspaceContext.workspace.tenant_id,
      },
      body,
      cache: "no-store",
    },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
