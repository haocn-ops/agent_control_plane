import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildBillingPostProxyInit } from "../route-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  return proxyControlPlane(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/billing/portal-sessions`,
    {
      init: await buildBillingPostProxyInit(request),
    },
  );
}
