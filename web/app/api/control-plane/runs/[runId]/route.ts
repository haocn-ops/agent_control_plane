import { proxyControlPlane } from "@/lib/control-plane-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } },
) {
  return proxyControlPlane(`/api/v1/runs/${params.runId}`);
}
