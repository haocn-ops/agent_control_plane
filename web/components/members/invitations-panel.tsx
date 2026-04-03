"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWorkspaceInvitations, revokeWorkspaceInvitation } from "@/services/control-plane";

function formatDate(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  return new Date(value).toLocaleString();
}

export function InvitationsPanel({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-invitations", workspaceSlug],
    queryFn: fetchWorkspaceInvitations,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeWorkspaceInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-invitations", workspaceSlug] });
    },
  });

  const invitations = data ?? [];
  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");
  const historicalInvitations = invitations.filter((invitation) => invitation.status !== "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
        <CardDescription>Track pending, accepted, expired, and revoked invitation state.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
          <p className="font-medium text-foreground">Invitation lifecycle</p>
          <p className="mt-1">
            When you create an invitation, a one-time token appears for copying; it is not retrievable later, so paste it
            into the onboarding note before closing the form. Invited users redeem the token at <code>/accept-invitation</code>.
            Revoke removes the pending record so the token can no longer be used; already accepted memberships stay active and
            must be manually deactivated if access should stop.
          </p>
        </div>
        {isLoading ? <p className="text-sm text-muted">Loading invitations...</p> : null}
        {isError ? <p className="text-sm text-muted">Invitation service unavailable.</p> : null}

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.15em] text-muted">Pending</p>
          {!isLoading && pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted">No pending invitations right now.</p>
          ) : null}

          {pendingInvitations.map((invitation) => (
            <div key={invitation.invitation_id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted">Role: {invitation.role}</p>
                </div>
                <Badge variant="strong">{invitation.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">Expires: {formatDate(invitation.expires_at)}</p>
              <p className="mt-1 text-xs text-muted">
                Invited by: {invitation.invited_by_display_name ?? invitation.invited_by_email ?? "workspace owner"}
              </p>
              <p className="mt-1 text-xs text-muted">Sent: {formatDate(invitation.created_at)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(invitation.invitation_id)}
                >
                  {revokeMutation.isPending ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs uppercase tracking-[0.15em] text-muted">Recent history</p>
          {!isLoading && historicalInvitations.length === 0 ? (
            <p className="text-sm text-muted">No accepted, expired, or revoked invitations yet.</p>
          ) : null}

          {historicalInvitations.map((invitation) => (
            <div key={invitation.invitation_id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted">Role: {invitation.role}</p>
                </div>
                <Badge variant="subtle">{invitation.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">Sent: {formatDate(invitation.created_at)}</p>
              <p className="mt-1 text-xs text-muted">Expires: {formatDate(invitation.expires_at)}</p>
              {invitation.accepted_at ? (
                <p className="mt-1 text-xs text-muted">Accepted: {formatDate(invitation.accepted_at)}</p>
              ) : null}
            </div>
          ))}
        </div>

        {revokeMutation.isError ? (
          <p className="text-xs text-muted">Invitation revoke failed. Check workspace permissions and retry.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
