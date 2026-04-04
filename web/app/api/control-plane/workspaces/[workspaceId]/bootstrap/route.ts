import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildWorkspaceBootstrapProxyInit } from "../../route-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } },
) {
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
  return proxyControlPlane(`/api/v1/saas/workspaces/${workspaceId}/bootstrap`, {
    includeTenant: false,
    init: await buildWorkspaceBootstrapProxyInit(request, {
      workspaceId,
      currentWorkspace: workspaceContext.workspace,
    }),
  });
}
