import { WorkspaceLaunchpad } from "@/components/home/workspace-launchpad";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workspaceContext = await resolveWorkspaceContextForServer();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace launchpad"
        title="SaaS Workspace Launch Hub"
        description="Track Week 8 readiness posture for the current workspace and jump into onboarding, credential, usage, billing, verification, and mock go-live surfaces."
        badge={<Badge variant="strong">{workspaceContext.workspace.slug}</Badge>}
      />
      <WorkspaceLaunchpad workspaceSlug={workspaceContext.workspace.slug} />
    </div>
  );
}
