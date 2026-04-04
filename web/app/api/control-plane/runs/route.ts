import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";
import { proxyWorkspaceScopedPostRequest } from "../post-route-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  return proxyWorkspaceScopedPostRequest({
    request,
    path: "/api/v1/runs",
    workspace: workspaceContext.workspace,
    contentType: request.headers.get("content-type") ?? "application/json",
  });
}
