import {
  AdminFollowUpNotice,
  type AdminFollowUpSurface,
} from "@/components/admin/admin-follow-up-notice";
import {
  buildConsoleAdminFollowUpPayload,
  type ConsoleAdminFollowUpPayload,
  type ConsoleHandoffState,
} from "@/lib/console-handoff";

type ConsoleAdminFollowUpProps = {
  handoff: ConsoleHandoffState;
  surface: AdminFollowUpSurface;
  workspaceSlug: string;
  payload?: ConsoleAdminFollowUpPayload | null;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
};

export function ConsoleAdminFollowUp({
  handoff,
  surface,
  workspaceSlug,
  payload: payloadOverride,
  ownerDisplayName = handoff.recentOwnerDisplayName ?? handoff.recentOwnerLabel,
  ownerEmail = handoff.recentOwnerEmail,
}: ConsoleAdminFollowUpProps) {
  const payload =
    payloadOverride ??
    buildConsoleAdminFollowUpPayload({
      handoff,
      ownerDisplayName,
      ownerEmail,
    });
  if (!payload) {
    return null;
  }

  return (
    <AdminFollowUpNotice
      surface={surface}
      workspaceSlug={workspaceSlug}
      sourceWorkspaceSlug={handoff.attentionWorkspace}
      runId={handoff.runId}
      {...payload}
    />
  );
}
