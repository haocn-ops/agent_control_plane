import type { ControlPlaneWorkspaceDeliveryTrack } from "@/lib/control-plane-types";
import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function buildDefaultSection(timestamp: string): ControlPlaneWorkspaceDeliveryTrack["verification"] {
  return {
    status: "pending",
    owner_user_id: null,
    notes: null,
    evidence_links: [],
    updated_at: timestamp,
  };
}

function buildFallbackTrack(workspaceId: string): ControlPlaneWorkspaceDeliveryTrack {
  const now = new Date().toISOString();
  return {
    workspace_id: workspaceId,
    verification: buildDefaultSection(now),
    go_live: buildDefaultSection(now),
  };
}

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const workspaceId = workspaceContext.workspace.workspace_id;
  const upstream = await proxyControlPlane(`/api/v1/saas/workspaces/${workspaceId}/delivery`, {
    includeTenant: true,
  });

  if (upstream.ok) {
    return upstream;
  }
  if (upstream.status !== 404 && upstream.status !== 503) {
    return upstream;
  }

  return Response.json({
    data: buildFallbackTrack(workspaceId),
    meta: {
      request_id: "preview-request",
      trace_id: "preview-trace",
    },
  });
}

export async function POST(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const workspaceId = workspaceContext.workspace.workspace_id;
  const body = await request.text();
  const upstream = await proxyControlPlane(`/api/v1/saas/workspaces/${workspaceId}/delivery`, {
    includeTenant: true,
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: body.length === 0 ? undefined : body,
    },
  });

  return upstream;
}
