import { proxyToolProviderPost } from "../route-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { toolProviderId: string } },
) {
  return proxyToolProviderPost(request, params.toolProviderId);
}
