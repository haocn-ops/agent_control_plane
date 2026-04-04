import { proxyControlPlane, requireMetadataWorkspaceContext } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer, type WorkspaceContext } from "@/lib/workspace-context";

export type MetadataGetArgs = {
  getPath: (workspaceContext: WorkspaceContext) => string;
  includeTenant?: boolean;
  message: string;
};

export async function proxyMetadataGet(args: MetadataGetArgs): Promise<Response> {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const metadataGuard = requireMetadataWorkspaceContext({
    workspaceContext,
    message: args.message,
  });
  if (metadataGuard) {
    return metadataGuard;
  }

  return proxyControlPlane(args.getPath(workspaceContext), {
    includeTenant: args.includeTenant,
  });
}
