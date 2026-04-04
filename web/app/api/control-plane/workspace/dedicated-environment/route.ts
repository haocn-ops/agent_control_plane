import { proxyControlPlane, requireMetadataWorkspaceContext } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildProxyControlPlanePostInit } from "../post-route-helpers";
import { buildWorkspaceEnterprisePostInit } from "../route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  return proxyControlPlane(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/dedicated-environment`,
    {
      init: {
        method: "GET",
      },
    },
  );
}

export async function POST(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const metadataGuard = requireMetadataWorkspaceContext({
    workspaceContext,
    message:
      "Dedicated environment updates require metadata-backed SaaS context. Preview and env fallback modes are disabled for this endpoint.",
  });
  if (metadataGuard) {
    return metadataGuard;
  }

  return proxyControlPlane(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/dedicated-environment`,
    {
      // init: await buildProxyControlPlanePostInit({ request, accept: request.headers.get("accept") ?? null, contentType: request.headers.get("content-type") ?? null, emptyBodyAsUndefined: true, })
      init: await buildWorkspaceEnterprisePostInit(request),
    },
  );
}
