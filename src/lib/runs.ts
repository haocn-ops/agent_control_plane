import { createId, nowIso } from "./ids.js";
import type { RunCreateRequest, RunWorkflowParams } from "../types.js";

export interface LaunchRunArgs {
  env: Env;
  tenantId: string;
  traceId: string;
  subjectId: string;
  body: RunCreateRequest;
  parentRunId?: string | null;
  replaySourceRunId?: string | null;
}

export interface LaunchRunResult {
  runId: string;
  createdAt: string;
  inputBlobKey: string;
}

export async function launchRun(args: LaunchRunArgs): Promise<LaunchRunResult> {
  const runId = createId("run");
  const createdAt = nowIso();
  const inputBlobKey = `tenants/${args.tenantId}/runs/${runId}/input.json`;

  await args.env.ARTIFACTS_BUCKET.put(inputBlobKey, JSON.stringify(args.body, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  await args.env.DB.prepare(
    `INSERT INTO runs (
        run_id, tenant_id, trace_id, parent_run_id, replay_source_run_id, entry_agent_id, status,
        workflow_instance_id, current_step_id, pending_approval_id, input_blob_key, context_json,
        error_code, error_message, created_by, created_at, updated_at, completed_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?10, NULL, NULL, ?11, ?12, ?12, NULL)`,
  )
    .bind(
      runId,
      args.tenantId,
      args.traceId,
      args.parentRunId ?? null,
      args.replaySourceRunId ?? null,
      args.body.entry_agent_id ?? null,
      "queued",
      runId,
      inputBlobKey,
      JSON.stringify(args.body.context ?? {}),
      args.subjectId,
      createdAt,
    )
    .run();

  const coordinatorStub = args.env.RUN_COORDINATOR.get(args.env.RUN_COORDINATOR.idFromName(runId));
  await coordinatorStub.fetch("https://run-coordinator.internal/init", {
    method: "POST",
    body: JSON.stringify({
      run_id: runId,
      tenant_id: args.tenantId,
      status: "queued",
      last_sequence_no: 0,
      pending_approval_id: null,
      current_step_id: null,
    }),
  });

  const workflowParams: RunWorkflowParams = {
    runId,
    tenantId: args.tenantId,
    traceId: args.traceId,
    requestId: createId("req"),
    subjectId: args.subjectId,
    entryAgentId: args.body.entry_agent_id ?? null,
    inputBlobKey,
    context: args.body.context ?? {},
    policyContext: args.body.policy_context ?? {},
  };

  await args.env.RUN_WORKFLOW.create({
    id: runId,
    params: workflowParams,
  });

  return {
    runId,
    createdAt,
    inputBlobKey,
  };
}
