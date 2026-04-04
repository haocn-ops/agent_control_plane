import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { buildProxyControlPlanePostInit } from "../post-route-helpers";

export type ToolProviderAction = "disable";

export function buildToolProviderPath(toolProviderId: string, action?: ToolProviderAction): string {
  const basePath = `/api/v1/tool-providers/${toolProviderId}`;
  return action === "disable" ? `${basePath}:disable` : basePath;
}

export async function proxyToolProviderPost(
  request: Request,
  toolProviderId: string,
  action?: ToolProviderAction,
  resolveWorkspaceContext: typeof resolveWorkspaceContextForServer = resolveWorkspaceContextForServer,
): Promise<Response> {
  const workspaceContext = await resolveWorkspaceContext();
  return proxyControlPlane(buildToolProviderPath(toolProviderId, action), {
    workspaceContext,
    init: await buildProxyControlPlanePostInit({ request }),
  });
}
