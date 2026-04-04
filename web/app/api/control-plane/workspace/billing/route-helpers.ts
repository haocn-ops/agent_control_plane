import { buildProxyControlPlanePostInit } from "../post-route-helpers";

export function buildBillingGetProxyInit(): RequestInit {
  return {
    method: "GET",
  };
}

export async function buildBillingPostProxyInit(request: Request): Promise<RequestInit> {
  return buildProxyControlPlanePostInit({
    request,
    accept: request.headers.get("accept") ?? undefined,
    contentType: request.headers.get("content-type") ?? undefined,
  });
}
