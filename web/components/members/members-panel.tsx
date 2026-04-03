"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWorkspaceMembers } from "@/services/control-plane";

function formatJoinedAt(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  return new Date(value).toLocaleString();
}

export function MembersPanel({ workspaceSlug }: { workspaceSlug: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-members", workspaceSlug],
    queryFn: fetchWorkspaceMembers,
  });

  const members = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace members</CardTitle>
        <CardDescription>Role and status visibility for the selected workspace.</CardDescription>
      </CardHeader>
     <CardContent className="space-y-3">
        <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
          <p className="font-medium text-foreground">Who to invite first</p>
          <p className="mt-1">
            A viewer keeps verification evidence readable, an operator handles the first run / plan checks, and
            an approver covers the legal gate if you need approvals before going live. Adjust roles later once the
            workspace has real usage or billing evidence.
          </p>
        </div>
        {isLoading ? <p className="text-sm text-muted">Loading members...</p> : null}
        {isError ? <p className="text-sm text-muted">Members endpoint unavailable, showing fallback state.</p> : null}
        {!isLoading && members.length === 0 ? (
          <p className="text-sm text-muted">No members found for this workspace yet.</p>
        ) : null}

        {members.map((member) => (
          <div key={member.user_id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.display_name ?? member.email}</p>
                <p className="mt-1 text-xs text-muted">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="subtle">{member.role}</Badge>
                <Badge variant={member.status === "active" ? "strong" : "default"}>{member.status}</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">Joined: {formatJoinedAt(member.joined_at)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
