import { proxyControlPlaneOrFallback } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { proxyWorkspaceScopedPostRequest } from "../post-route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();

  return proxyControlPlaneOrFallback(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/service-accounts`,
    {
      items: [],
      page_info: {
        next_cursor: null,
      },
    },
  );
}

export async function POST(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  return proxyWorkspaceScopedPostRequest({
    request,
    workspace: workspaceContext.workspace,
    path: `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/service-accounts`,
  });
}
