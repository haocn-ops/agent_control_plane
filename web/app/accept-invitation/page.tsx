"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { acceptWorkspaceInvitation } from "@/services/control-plane";

function AcceptInvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteToken, setInviteToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptedWorkspace, setAcceptedWorkspace] = useState<{
    workspace_slug: string;
    display_name: string;
    organization_display_name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const token = searchParams.get("token") ?? searchParams.get("invite_token") ?? "";
    if (token) {
      setInviteToken(token);
    }
  }, [searchParams]);

  function buildOnboardingPath(pathname: string): string {
    if (!acceptedWorkspace) {
      return pathname;
    }

    const [basePath, rawQuery] = pathname.split("?", 2);
    const params = new URLSearchParams(rawQuery ?? "");
    const continuityKeys = [
      "week8_focus",
      "attention_organization",
      "delivery_context",
      "recent_track_key",
      "recent_update_kind",
      "evidence_count",
      "recent_owner_label",
      "recent_owner_display_name",
      "recent_owner_email",
    ];

    for (const key of continuityKeys) {
      const value = searchParams.get(key);
      if (value && !params.has(key)) {
        params.set(key, value);
      }
    }

    params.set("source", "onboarding");
    params.set("attention_workspace", acceptedWorkspace.workspace_slug);
    params.set("delivery_context", "recent_activity");
    params.set("recent_owner_label", acceptedWorkspace.display_name);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  async function openWorkspaceSurface(pathname: string): Promise<void> {
    if (!acceptedWorkspace) {
      router.push(pathname);
      return;
    }

    try {
      setIsSwitchingWorkspace(true);
      const response = await fetch("/api/workspace-context", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspace_slug: acceptedWorkspace.workspace_slug,
        }),
      });
      if (!response.ok) {
        throw new Error(`Workspace switch failed (${response.status})`);
      }
      router.push(pathname);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to switch workspace");
    } finally {
      setIsSwitchingWorkspace(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          eyebrow="Invitation"
          title="Accept workspace invitation"
          description="Paste the one-time invite token to join the invited workspace under your current SaaS user."
        />

        <Card>
          <CardHeader>
            <CardTitle>Accept invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Invite token"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.currentTarget.value)}
            />
            <div className="rounded-2xl border border-border bg-background p-3 text-xs text-muted">
              <p className="font-medium text-foreground">Token guidance</p>
              <p className="mt-1">
                Copy once, paste here, and accept before the one-time token expires or is revoked. The action will attach to the SaaS user already signed in, so keep this browser session active.
              </p>
            </div>
            <Button
              disabled={isSubmitting || inviteToken.trim() === ""}
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  setErrorMessage(null);
                  const result = await acceptWorkspaceInvitation(inviteToken.trim());
                  setAcceptedWorkspace({
                    workspace_slug: result.workspace.slug,
                    display_name: result.workspace.display_name,
                    organization_display_name: result.workspace.organization_display_name,
                    role: result.membership.role,
                  });
                } catch (error) {
                  setAcceptedWorkspace(null);
                  setErrorMessage(error instanceof Error ? error.message : "Invitation accept failed");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Accepting..." : "Accept invitation"}
            </Button>

            {errorMessage ? <p className="text-sm text-muted">{errorMessage}</p> : null}

            {acceptedWorkspace ? (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">
                    Joined {acceptedWorkspace.organization_display_name} / {acceptedWorkspace.display_name}
                  </p>
                  <p className="mt-1 text-xs text-muted">Workspace role: {acceptedWorkspace.role}</p>
                  <p className="mt-1 text-xs text-muted">
                    The actions below will switch your current workspace context to{" "}
                    <span className="font-medium text-foreground">{acceptedWorkspace.workspace_slug}</span> first.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 text-xs text-muted">
                  <p className="font-medium text-foreground">Suggested next steps</p>
                  <p className="mt-1">
                    Viewers can head straight to verification or usage to review audit and billing context, operators usually ensure the first run via the playground, and approvers revisit the Week 8 checklist before signing off.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSwitchingWorkspace}
                      onClick={() => void openWorkspaceSurface(buildOnboardingPath("/members"))}
                    >
                      {isSwitchingWorkspace ? "Switching..." : "Confirm members"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSwitchingWorkspace}
                      onClick={() => void openWorkspaceSurface(buildOnboardingPath("/playground"))}
                    >
                      {isSwitchingWorkspace ? "Switching..." : "Run a demo"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSwitchingWorkspace}
                      onClick={() =>
                        void openWorkspaceSurface(buildOnboardingPath("/verification?surface=verification"))
                      }
                    >
                      {isSwitchingWorkspace ? "Switching..." : "Open Week 8 checklist"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSwitchingWorkspace}
                      onClick={() => void openWorkspaceSurface(buildOnboardingPath("/go-live?surface=go_live"))}
                    >
                      {isSwitchingWorkspace ? "Switching..." : "Open mock go-live drill"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            <p className="text-xs text-muted">
              The token is single-purpose. If it has expired or been revoked, ask the workspace admin to issue a new
              invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background px-6 py-10 text-foreground" />}>
      <AcceptInvitationPageContent />
    </Suspense>
  );
}
