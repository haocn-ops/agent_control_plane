export type WorkspaceBootstrapHeaderContext = {
  workspace_id: string;
  slug: string;
  tenant_id: string;
};

export function buildForwardedAuthHeaders(request: Request): Headers {
  const headers = new Headers();
  const forwardedSubject =
    request.headers.get("x-authenticated-subject") ??
    request.headers.get("cf-access-authenticated-user-email");
  const forwardedRoles =
    request.headers.get("x-authenticated-roles") ??
    request.headers.get("cf-access-authenticated-user-groups");

  if (forwardedSubject) {
    headers.set("x-authenticated-subject", forwardedSubject);
  }
  if (forwardedRoles) {
    headers.set("x-authenticated-roles", forwardedRoles);
  }

  return headers;
}

import { buildProxyControlPlanePostInit } from "../post-route-helpers";

export async function buildWorkspaceCreateProxyInit(request: Request): Promise<RequestInit> {
  return buildProxyControlPlanePostInit({
    request,
    accept: null,
  });
}

export async function buildWorkspaceBootstrapProxyInit(
  request: Request,
  args: {
    workspaceId: string;
    currentWorkspace: WorkspaceBootstrapHeaderContext;
  },
): Promise<RequestInit> {
  const init = await buildProxyControlPlanePostInit({
    request,
    accept: null,
    headers: buildForwardedAuthHeaders(request),
  });

  const headers = new Headers(init.headers);
  headers.set("x-workspace-id", args.workspaceId);
  if (args.currentWorkspace.workspace_id === args.workspaceId) {
    headers.set("x-workspace-slug", args.currentWorkspace.slug);
    headers.set("x-tenant-id", args.currentWorkspace.tenant_id);
  }

  return {
    ...init,
    headers,
  };
}
