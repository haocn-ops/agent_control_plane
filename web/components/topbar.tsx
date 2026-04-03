import { Bell, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

function formatContextSourceLabel(source: "metadata" | "env-fallback" | "preview-fallback"): string {
  if (source === "metadata") {
    return "SaaS metadata";
  }
  if (source === "env-fallback") {
    return "Environment fallback";
  }
  return "Preview fallback";
}

export async function Topbar() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const subjectLabel =
    workspaceContext.session_user?.email ??
    workspaceContext.session_user?.auth_subject ??
    workspaceContext.workspace.subject_id ??
    "anonymous";
  const sourceLabel = formatContextSourceLabel(workspaceContext.source);
  const workspaceCount = workspaceContext.available_workspaces.length;
  const authProvider = workspaceContext.session_user?.auth_provider ?? "local";
  const rolesLabel =
    workspaceContext.workspace.subject_roles
      ?.split(",")
      .map((role) => role.trim())
      .filter((role) => role.length > 0)
      .slice(0, 2)
      .join(", ") ?? "unscoped";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background px-6 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" placeholder="Search workspaces, runs, evidence..." />
          </div>
          <Badge variant="default">{workspaceContext.workspace.display_name}</Badge>
          <WorkspaceSwitcher
            currentWorkspaceSlug={workspaceContext.workspace.slug}
            workspaces={workspaceContext.available_workspaces}
          />
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <a
            href="/admin"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-background"
          >
            Admin queue
          </a>
          <button
            type="button"
            className="rounded-xl border border-border bg-card p-2 text-muted transition hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="subtle">session: {subjectLabel}</Badge>
        <Badge variant="subtle">provider: {authProvider}</Badge>
        <Badge variant="subtle">roles: {rolesLabel}</Badge>
        <Badge variant="subtle">context: {sourceLabel}</Badge>
        <Badge variant="subtle">workspaces: {workspaceCount}</Badge>
        <Badge variant="subtle">tenant: {workspaceContext.workspace.tenant_id}</Badge>
      </div>
    </header>
  );
}
