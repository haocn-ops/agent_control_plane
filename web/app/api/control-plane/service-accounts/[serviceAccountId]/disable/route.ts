import { proxyWorkspaceScopedDetailPost } from "../../../post-route-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { serviceAccountId: string } },
) {
  return proxyWorkspaceScopedDetailPost({
    request,
    buildPath: (workspaceId) =>
      `/api/v1/saas/workspaces/${workspaceId}/service-accounts/${params.serviceAccountId}:disable`,
  });
}
