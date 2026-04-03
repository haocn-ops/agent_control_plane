"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createServiceAccount } from "@/services/control-plane";

export function CreateServiceAccountForm({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState("workspace_service");
  const [description, setDescription] = useState("");

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
      await queryClient.invalidateQueries({
        queryKey: ["workspace-service-accounts", workspaceSlug],
      });
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
      {mutation.isError ? (
        <p className="text-xs text-muted">Service account creation failed. Check workspace permissions.</p>
      ) : null}
    </div>
  );
}
