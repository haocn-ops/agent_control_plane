import { proxyMetadataGet } from "../get-route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyMetadataGet({
    getPath: (workspaceContext) =>
      `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}/members`,
    message:
      "Workspace members require metadata-backed SaaS context. Preview and env fallback modes are disabled for this endpoint.",
  });
}
