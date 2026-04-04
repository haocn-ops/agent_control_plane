"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ControlPlaneRequestError, createApiKey } from "@/services/control-plane";

const DEFAULT_SCOPE = "runs:write";

function normalizeScope(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function buildRunQuickstart(secret: string): string {
  return `curl -X POST "\${API_BASE_URL:-https://api.govrail.net}/api/v1/runs" \\
  -H "Authorization: Bearer ${secret}" \\
  -H "Idempotency-Key: demo-run-001" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": {
      "kind": "user_instruction",
      "text": "Run the first workspace demo flow"
    }
  }'`;
}

function formatApiKeyError(error: unknown): string {
  if (error instanceof ControlPlaneRequestError) {
    if (error.code === "api_key_limit_reached") {
      const limit = typeof error.details.limit === "number" ? error.details.limit : "unknown";
      return `API key limit reached (${limit}). ${error.message}`;
    }
    return error.message ?? "API key request failed.";
  }
  return "API key request failed. Check workspace permissions.";
}

export function CreateApiKeyForm({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const [serviceAccountId, setServiceAccountId] = useState("");
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [expiresAt, setExpiresAt] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const mutation = useMutation({
    onMutate: () => {
      setSubmissionError(null);
    },
    mutationFn: async () =>
      createApiKey({
        service_account_id: serviceAccountId.trim() || undefined,
        scope: normalizeScope(scope),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: async (result) => {
      setRevealedSecret(result.secret_key);
      await queryClient.invalidateQueries({
        queryKey: ["workspace-api-keys", workspaceSlug],
      });
      setSubmissionError(null);
    },
    onError: (error: unknown) => {
      setSubmissionError(formatApiKeyError(error));
    },
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Service account ID (optional)"
        value={serviceAccountId}
        onChange={(event) => setServiceAccountId(event.currentTarget.value)}
      />
      <Input
        placeholder="Scopes, comma separated (for example: runs:write, runs:manage)"
        value={scope}
        onChange={(event) => setScope(event.currentTarget.value)}
      />
      <Input
        type="datetime-local"
        value={expiresAt}
        onChange={(event) => setExpiresAt(event.currentTarget.value)}
      />
      <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? "Creating key..." : "Create key"}
      </Button>
      {submissionError ? (
        <p className="text-xs text-red-600">{submissionError}</p>
      ) : null}
      {revealedSecret ? (
        <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted">One-time secret</p>
            <p className="mt-2 break-all font-mono text-sm text-foreground">{revealedSecret}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Quickstart</p>
            <p className="mt-2 text-xs text-muted">
              This example uses the new workspace API key flow for the first run. Replace `API_BASE_URL` if you are
              targeting a non-production environment.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-background p-3 text-xs text-foreground">
              <code>{buildRunQuickstart(revealedSecret)}</code>
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
