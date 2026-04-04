"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ControlPlaneToolProvider } from "@/lib/control-plane-types";
import {
  PlanLimitState,
  createToolProvider,
  fetchToolProviders,
  updateToolProviderStatus,
} from "@/services/control-plane";

function badgeVariant(status: string): "strong" | "default" {
  return status === "active" ? "strong" : "default";
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
}

export function ToolProviderList({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tool-providers", workspaceSlug],
    queryFn: fetchToolProviders,
  });

  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("https://");
  const [providerType, setProviderType] = useState<ControlPlaneToolProvider["provider_type"]>("http_api");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState<PlanLimitState>(null);

  const refreshProviders = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ["tool-providers", workspaceSlug],
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Provider name is required");
      }
      if (!endpointUrl.trim()) {
        throw new Error("Endpoint URL is required");
      }
      const result = await createToolProvider({
        name: name.trim(),
        provider_type: providerType,
        endpoint_url: endpointUrl.trim(),
        status: "active",
      });
      return result;
    },
    onSuccess: async ({ planLimit: nextPlanLimit }) => {
      setName("");
      setEndpointUrl("https://");
      setProviderType("http_api");
      setFormError(null);
      setActionError(null);
      setPlanLimit(nextPlanLimit);
      await refreshProviders();
    },
    onError: (error: unknown) => {
      setFormError(getErrorText(error));
      setPlanLimit((error as { planLimit?: PlanLimitState })?.planLimit ?? null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (args: { providerId: string; status: "active" | "disabled" }) => {
      return updateToolProviderStatus(args.providerId, args.status);
    },
    onSuccess: async ({ planLimit: nextPlanLimit }) => {
      setActionError(null);
      setPlanLimit(nextPlanLimit);
      await refreshProviders();
    },
    onError: (error: unknown) => {
      setActionError(getErrorText(error));
      setPlanLimit((error as { planLimit?: PlanLimitState })?.planLimit ?? null);
    },
  });

  const providers = data ?? [];
  const createDisabled = createMutation.isPending || updateStatusMutation.isPending;
  const sortedProviders = useMemo(
    () =>
      [...providers].sort((left, right) =>
        left.status === right.status ? left.name.localeCompare(right.name) : left.status === "active" ? -1 : 1,
      ),
    [providers],
  );

  return (
    <Card className="space-y-0">
      <CardHeader>
        <CardTitle>Connected providers</CardTitle>
        <CardDescription>Live inventory from `GET /api/v1/tool-providers` when base URL is configured.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted">Loading providers...</p> : null}
        {isError ? <p className="text-sm text-muted">Falling back to preview provider inventory.</p> : null}
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">Add provider</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Provider name"
              disabled={createDisabled}
            />
            <select
              value={providerType}
              onChange={(event) => setProviderType(event.target.value as ControlPlaneToolProvider["provider_type"])}
              disabled={createDisabled}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
            >
              <option value="http_api">http_api</option>
              <option value="mcp_server">mcp_server</option>
              <option value="mcp_portal">mcp_portal</option>
            </select>
            <Input
              value={endpointUrl}
              onChange={(event) => setEndpointUrl(event.target.value)}
              placeholder="Endpoint URL"
              disabled={createDisabled}
              className="sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setFormError(null);
                setPlanLimit(null);
                void createMutation.mutateAsync();
              }}
              disabled={createDisabled}
            >
              {createMutation.isPending ? "Creating..." : "Create provider"}
            </Button>
            <p className="text-xs text-muted">New providers default to active status.</p>
          </div>
          {formError ? <p className="mt-2 text-xs text-red-600">{formError}</p> : null}
        </div>

        {planLimit ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <p className="text-sm font-medium">Plan limit reached</p>
            <p className="mt-1 text-xs">
              {planLimit.message} Scope: <span className="font-medium">{planLimit.scope}</span>
              {planLimit.used !== null && planLimit.limit !== null
                ? ` (${planLimit.used}/${planLimit.limit})`
                : ""}.
            </p>
            <p className="mt-1 text-xs">
              Upgrade workspace plan or disable an existing active provider, then retry this action.
            </p>
          </div>
        ) : null}

        {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
        {sortedProviders.map((provider) => (
          <div key={provider.tool_provider_id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{provider.name}</p>
                <p className="mt-1 text-xs text-muted">{provider.tool_provider_id}</p>
              </div>
              <Badge variant={badgeVariant(provider.status)}>{provider.status}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
              <p>Type: {provider.provider_type}</p>
              <p>Endpoint: {provider.endpoint_url}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {provider.status === "active" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => {
                    setActionError(null);
                    setPlanLimit(null);
                    void updateStatusMutation.mutateAsync({
                      providerId: provider.tool_provider_id,
                      status: "disabled",
                    });
                  }}
                >
                  Disable
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => {
                    setActionError(null);
                    setPlanLimit(null);
                    void updateStatusMutation.mutateAsync({
                      providerId: provider.tool_provider_id,
                      status: "active",
                    });
                  }}
                >
                  Activate
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
