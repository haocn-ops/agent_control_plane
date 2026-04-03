import { PolicyMatrix } from "@/components/egress/policy-matrix";
import { PageHeader } from "@/components/page-header";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export default async function EgressPage() {
  const workspaceContext = await resolveWorkspaceContextForServer();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Egress"
        title="Outbound permission control"
        description="Review which destinations are allowed, denied, or routed through approval-required policy."
      />
      <PolicyMatrix workspaceSlug={workspaceContext.workspace.slug} />
    </div>
  );
}
