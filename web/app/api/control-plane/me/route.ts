import { proxyMetadataGet } from "../get-route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyMetadataGet({
    getPath: () => "/api/v1/saas/me",
    includeTenant: false,
    message:
      "Session identity requires metadata-backed SaaS context. Preview and env fallback modes are disabled for this endpoint.",
  });
}
