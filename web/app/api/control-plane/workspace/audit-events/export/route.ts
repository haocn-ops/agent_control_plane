import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.toString();
  const path = query
    ? `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/audit-events:export?${query}`
    : `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/audit-events:export`;

  return proxyControlPlane(path, {
    init: {
      method: "GET",
      headers: {
        accept: request.headers.get("accept") ?? "application/json, application/x-ndjson",
      },
    },
  });
}
