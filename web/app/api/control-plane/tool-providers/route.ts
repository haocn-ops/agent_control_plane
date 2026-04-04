import { previewToolProviders } from "@/lib/control-plane-preview";
import { proxyControlPlaneOrFallback } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { proxyWorkspaceScopedPostRequest } from "../post-route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyControlPlaneOrFallback(
    "/api/v1/tool-providers",
    {
      items: previewToolProviders,
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
    path: "/api/v1/tool-providers",
    workspace: workspaceContext.workspace,
  });
}
