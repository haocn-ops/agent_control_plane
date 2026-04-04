"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ControlPlaneRequestError, createWorkspaceInvitation } from "@/services/control-plane";

export function CreateInvitationForm({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [expiresAt, setExpiresAt] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      createWorkspaceInvitation({
        email: email.trim(),
        role: role.trim() || "viewer",
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: async (result) => {
      setRevealedToken(result.invite_token);
      setEmail("");
      setRole("viewer");
      setExpiresAt("");
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["workspace-invitations", workspaceSlug],
      });
    },
    onError: (error: unknown) => {
      if (error instanceof ControlPlaneRequestError && error.code === "invitation_limit_reached") {
        setFormError("Invitation limit reached. Disable an existing invite or upgrade the plan.");
        return;
      }
      setFormError(error instanceof Error ? error.message : "Invitation creation failed. Check email, role, and workspace access.");
    },
  });

  return (
    <div className="space-y-4">
      <Input
        type="email"
        placeholder="Member email"
        value={email}
        onChange={(event) => setEmail(event.currentTarget.value)}
      />
      <Input
        placeholder="Role (for example: viewer, operator, approver)"
        value={role}
        onChange={(event) => setRole(event.currentTarget.value)}
      />
      <Input
        type="datetime-local"
        value={expiresAt}
        onChange={(event) => setExpiresAt(event.currentTarget.value)}
      />
      <Button disabled={mutation.isPending || email.trim() === ""} onClick={() => mutation.mutate()}>
        {mutation.isPending ? "Sending invitation..." : "Create invitation"}
      </Button>
      <p className="text-xs text-muted">
        Viewer is recommended for auditors, operator keeps run & billing flows moving, and approver handles legal checks. Pick the role that matches the task you want the newcomer to own, then adjust later from the Members panel if needed.
      </p>
      {formError ? <p className="text-xs text-muted">{formError}</p> : null}
      {revealedToken ? (
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-muted">One-time invite token</p>
          <p className="mt-2 break-all font-mono text-sm text-foreground">{revealedToken}</p>
          <p className="mt-2 text-xs text-muted">
            This token is shown only once. Share it over your existing channel, and remind the recipient to redeem it via <code>/accept-invitation</code> before it expires.
          </p>
        </div>
      ) : null}
    </div>
  );
}
