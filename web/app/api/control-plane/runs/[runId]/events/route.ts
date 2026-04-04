import { proxyRunDetailRequest } from "../../route-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { runId: string } },
) {
  return proxyRunDetailRequest({ request, runId: params.runId, suffix: "/events" });
}
