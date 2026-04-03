import { proxyControlPlaneOrFallback } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const subject = workspaceContext.workspace.subject_id ?? "anonymous";
  const sessionUser = workspaceContext.session_user;

  return proxyControlPlaneOrFallback(
    "/api/v1/saas/me",
    {
      user: {
        user_id: sessionUser?.user_id ?? subject,
        email: sessionUser?.email ?? subject,
        auth_provider: sessionUser?.auth_provider ?? "workspace_context",
        auth_subject: sessionUser?.auth_subject ?? subject,
      },
      workspaces: workspaceContext.available_workspaces.map((workspace) => ({
        workspace_id: workspace.workspace_id,
        slug: workspace.slug,
        display_name: workspace.display_name,
        membership_role: "workspace_owner",
      })),
    },
    { includeTenant: false },
  );
}
