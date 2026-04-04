import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildBillingGetProxyInit } from "../route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  return proxyControlPlane(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/billing/providers`,
    {
      init: buildBillingGetProxyInit(),
    },
  );
}
