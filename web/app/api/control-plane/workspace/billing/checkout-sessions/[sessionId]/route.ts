import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildBillingGetProxyInit } from "../../route-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const { sessionId } = params;
  return proxyControlPlane(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/billing/checkout-sessions/${sessionId}`,
    {
      init: buildBillingGetProxyInit(),
    },
  );
}
