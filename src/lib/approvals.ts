import { recordAuditEvent } from "./audit.js";
import { getApproval } from "./db.js";
import { nowIso } from "./ids.js";

export async function expireApproval(args: {
  env: Env;
  tenantId: string;
  approvalId: string;
  traceId: string;
  reason: string;
  actorType: string;
  actorRef?: string | null;
  terminateWorkflow?: boolean;
}): Promise<boolean> {
  const approval = await getApproval(args.env, args.tenantId, args.approvalId);
  if (!approval || approval.status !== "pending") {
    return false;
  }

  const timestamp = nowIso();
  await args.env.DB.batch([
    args.env.DB.prepare(
      `UPDATE approvals
          SET status = 'expired',
              decided_at = COALESCE(decided_at, ?1)
        WHERE tenant_id = ?2 AND approval_id = ?3 AND status = 'pending'`,
    ).bind(timestamp, args.tenantId, args.approvalId),
    args.env.DB.prepare(
      `UPDATE runs
          SET status = 'failed',
              pending_approval_id = NULL,
              error_code = 'approval_expired',
              error_message = 'Approval expired before a decision was received',
              updated_at = ?1,
              completed_at = ?1
        WHERE tenant_id = ?2 AND run_id = ?3`,
    ).bind(timestamp, args.tenantId, approval.run_id),
  ]);

  await recordAuditEvent({
    env: args.env,
    tenantId: args.tenantId,
    runId: approval.run_id,
    stepId: approval.step_id,
    traceId: args.traceId,
    eventType: "approval_expired",
    actorType: args.actorType,
    actorRef: args.actorRef ?? null,
    payload: {
      approval_id: approval.approval_id,
      policy_id: approval.policy_id,
      reason: args.reason,
    },
    createdAt: timestamp,
  });

  const approvalStub = args.env.APPROVAL_SESSION.get(args.env.APPROVAL_SESSION.idFromName(args.approvalId));
  await approvalStub.fetch("https://approval-session.internal/expire", {
    method: "POST",
    body: JSON.stringify({
      approval_id: approval.approval_id,
      run_id: approval.run_id,
      status: "expired",
      decision: null,
    }),
  });

  const coordinatorStub = args.env.RUN_COORDINATOR.get(args.env.RUN_COORDINATOR.idFromName(approval.run_id));
  await coordinatorStub.fetch("https://run-coordinator.internal/approval", {
    method: "POST",
    body: JSON.stringify({ approval_id: null }),
  });
  await coordinatorStub.fetch("https://run-coordinator.internal/status", {
    method: "POST",
    body: JSON.stringify({ status: "failed" }),
  });

  if (args.terminateWorkflow) {
    try {
      const instance = await args.env.RUN_WORKFLOW.get(approval.run_id);
      await instance.terminate();
    } catch {
      // Ignore terminal-instance races.
    }
  }

  return true;
}
