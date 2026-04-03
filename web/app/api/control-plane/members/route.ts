import { proxyControlPlane, proxyControlPlaneOrFallback } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const workspaceId = workspaceContext.workspace.workspace_id;

  const membersUpstream = await proxyControlPlane(`/api/v1/saas/workspaces/${workspaceId}/members`);
  if (membersUpstream.ok) {
    return membersUpstream;
  }

  const workspaceUpstream = await proxyControlPlane(`/api/v1/saas/workspaces/${workspaceId}`);
  if (workspaceUpstream.ok) {
    const payload = (await workspaceUpstream.json()) as {
      data?: {
        members?: Array<{
          user_id: string;
          email: string;
          display_name: string | null;
          role: string;
          status: string;
          joined_at: string | null;
        }>;
      };
      meta?: {
        request_id?: string;
        trace_id?: string;
      };
    };

    return Response.json({
      data: {
        items: payload.data?.members ?? [],
        page_info: {
          next_cursor: null,
        },
      },
      meta: {
        request_id: payload.meta?.request_id ?? "workspace-members-fallback",
        trace_id: payload.meta?.trace_id ?? "workspace-members-fallback",
      },
    });
  }

  return proxyControlPlaneOrFallback(
    `/api/v1/saas/workspaces/${workspaceId}/members`,
    {
      items: [],
      page_info: {
        next_cursor: null,
      },
    },
  );
}
