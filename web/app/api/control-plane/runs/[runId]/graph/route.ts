import { proxyRunDetailRequest } from "../../route-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } },
) {
  return proxyRunDetailRequest({ request: _request, runId: params.runId, suffix: "/graph" });
}
