import { PageHeader } from "@/components/page-header";
import { ToolProviderList } from "@/components/agents/tool-provider-list";
import { AgentStatusList } from "@/components/dashboard/agent-status-list";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export default async function AgentsPage() {
  const workspaceContext = await resolveWorkspaceContextForServer();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agents"
        title="Agent lifecycle management"
        description="Inspect agents, review regional placement, and manage runtime providers with quick activate/disable actions."
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AgentStatusList />
        <ToolProviderList workspaceSlug={workspaceContext.workspace.slug} />
      </div>
    </div>
  );
}
