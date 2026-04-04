import { proxyWorkspaceScopedDetailPost } from "../../../post-route-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { apiKeyId: string } },
) {
  return proxyWorkspaceScopedDetailPost({
    request,
    buildPath: (workspaceId) =>
      `/api/v1/saas/workspaces/${workspaceId}/api-keys/${params.apiKeyId}:revoke`,
  });
}
