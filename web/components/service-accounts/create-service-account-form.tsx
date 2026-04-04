"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ControlPlaneRequestError, createServiceAccount } from "@/services/control-plane";

function describeServiceAccountError(error: unknown): string {
  if (error instanceof ControlPlaneRequestError) {
    if (error.code === "service_account_limit_reached") {
      return "Service account limit reached. Disable another account or upgrade the plan.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Service account creation failed. Check workspace permissions.";
}

export function CreateServiceAccountForm({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState("workspace_service");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      createServiceAccount({
        name: name.trim(),
        role: role.trim() || "workspace_service",
        description: description.trim() || null,
      }),
    onSuccess: async () => {
      setName("");
      setRole("workspace_service");
      setDescription("");
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["workspace-service-accounts", workspaceSlug],
      });
    },
    onError: (error: unknown) => {
      setFormError(describeServiceAccountError(error));
    },
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Service account name"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <Input
        placeholder="Role (for example: workspace_service)"
        value={role}
        onChange={(event) => setRole(event.currentTarget.value)}
      />
      <Textarea
        placeholder="Description or intended runtime purpose"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
      />
      <Button disabled={mutation.isPending || name.trim() === ""} onClick={() => mutation.mutate()}>
        {mutation.isPending ? "Creating service account..." : "Create service account"}
      </Button>
      {formError ? <p className="text-xs text-muted">{formError}</p> : null}
    </div>
  );
}
