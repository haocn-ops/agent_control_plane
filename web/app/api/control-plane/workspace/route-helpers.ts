import { buildProxyControlPlanePostInit } from "../post-route-helpers";

export async function buildWorkspaceEnterprisePostInit(request: Request): Promise<RequestInit> {
  return buildProxyControlPlanePostInit({
    request,
    accept: request.headers.get("accept") ?? null,
    contentType: request.headers.get("content-type") ?? null,
    emptyBodyAsUndefined: true,
  });
}
