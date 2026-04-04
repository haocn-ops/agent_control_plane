import { proxyControlPlane } from "@/lib/control-plane-proxy";
import { buildWorkspaceCreateProxyInit } from "./route-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxyControlPlane("/api/v1/saas/workspaces", {
    includeTenant: false,
    init: await buildWorkspaceCreateProxyInit(request),
  });
}
