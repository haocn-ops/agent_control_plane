import { createId, nowIso } from "./ids.js";
import { ApiError } from "./http.js";
import type {
  ApprovalRow,
  ArtifactRow,
  IdempotencyRecordRow,
  PolicyRow,
  RunCoordinatorState,
  RunRow,
  RunStepRow,
  ToolProviderRow,
  ToolProviderStatus,
} from "../types.js";

export interface RunGraphQueryOptions {
  includePayloads?: boolean;
  pageSize?: number;
  cursor?: string | null;
}

export interface RunListQueryOptions {
  pageSize?: number;
  cursor?: string | null;
}

export interface RunGraphArtifactRow extends ArtifactRow {
  body?: unknown;
}

export interface RunGraphResult {
  steps: RunStepRow[];
  approvals: ApprovalRow[];
  artifacts: RunGraphArtifactRow[];
  page_info: {
    next_cursor: string | null;
  };
}

interface RunGraphCursorState {
  step_offset: number;
  approval_offset: number;
  artifact_offset: number;
}

interface RunListCursorState {
  offset: number;
}

const DEFAULT_GRAPH_PAGE_SIZE = 100;

export async function getRun(env: Env, tenantId: string, runId: string): Promise<RunRow | null> {
  return env.DB.prepare(
    `SELECT run_id, tenant_id, trace_id, entry_agent_id, status, workflow_instance_id, current_step_id,
            pending_approval_id, input_blob_key, context_json, error_code, error_message, created_by,
            created_at, updated_at, completed_at
       FROM runs
      WHERE tenant_id = ?1 AND run_id = ?2`,
  )
    .bind(tenantId, runId)
    .first<RunRow>();
}

export async function getApproval(
  env: Env,
  tenantId: string,
  approvalId: string,
): Promise<ApprovalRow | null> {
  return env.DB.prepare(
    `SELECT approval_id, run_id, step_id, policy_id, subject_type, subject_ref, status, requested_by,
            approver_scope_json, decision_by, decision_comment, decision_reason_code, expires_at,
            created_at, decided_at
       FROM approvals
      WHERE tenant_id = ?1 AND approval_id = ?2`,
  )
    .bind(tenantId, approvalId)
    .first<ApprovalRow>();
}

export async function getRunGraph(
  env: Env,
  tenantId: string,
  runId: string,
  options: RunGraphQueryOptions = {},
): Promise<RunGraphResult> {
  const pageSize = options.pageSize ?? DEFAULT_GRAPH_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new ApiError(400, "invalid_request", "page_size must be a positive integer");
  }

  const cursorState = parseRunGraphCursor(options.cursor);
  const [stepsResult, approvalsResult, artifactsResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT step_id, run_id, sequence_no, step_type, actor_type, actor_ref, status, started_at,
              ended_at, metadata_json
         FROM run_steps
        WHERE tenant_id = ?1 AND run_id = ?2
        ORDER BY sequence_no ASC, step_id ASC
        LIMIT ?3 OFFSET ?4`,
    ).bind(tenantId, runId, pageSize + 1, cursorState.step_offset),
    env.DB.prepare(
      `SELECT approval_id, run_id, step_id, policy_id, subject_type, subject_ref, status, requested_by,
              approver_scope_json, decision_by, decision_comment, decision_reason_code, expires_at,
              created_at, decided_at
         FROM approvals
        WHERE tenant_id = ?1 AND run_id = ?2
        ORDER BY created_at ASC, approval_id ASC
        LIMIT ?3 OFFSET ?4`,
    ).bind(tenantId, runId, pageSize + 1, cursorState.approval_offset),
    env.DB.prepare(
      `SELECT artifact_id, run_id, step_id, artifact_type, mime_type, r2_key, sha256, size_bytes, created_at
         FROM artifacts
        WHERE tenant_id = ?1 AND run_id = ?2
        ORDER BY created_at ASC, artifact_id ASC
        LIMIT ?3 OFFSET ?4`,
    ).bind(tenantId, runId, pageSize + 1, cursorState.artifact_offset),
  ]);

  const steps = (stepsResult?.results ?? []) as RunStepRow[];
  const approvals = (approvalsResult?.results ?? []) as ApprovalRow[];
  const artifacts = (artifactsResult?.results ?? []) as ArtifactRow[];

  const returnedSteps = steps.slice(0, pageSize);
  const returnedApprovals = approvals.slice(0, pageSize);
  const returnedArtifacts = artifacts.slice(0, pageSize);
  const hasMoreSteps = steps.length > pageSize;
  const hasMoreApprovals = approvals.length > pageSize;
  const hasMoreArtifacts = artifacts.length > pageSize;
  const nextCursor =
    hasMoreSteps || hasMoreApprovals || hasMoreArtifacts
      ? encodeRunGraphCursor({
          step_offset: cursorState.step_offset + returnedSteps.length,
          approval_offset: cursorState.approval_offset + returnedApprovals.length,
          artifact_offset: cursorState.artifact_offset + returnedArtifacts.length,
        })
      : null;

  const expandedArtifacts = options.includePayloads
    ? await Promise.all(returnedArtifacts.map(async (artifact) => expandRunGraphArtifact(env, artifact)))
    : returnedArtifacts;

  return {
    steps: returnedSteps,
    approvals: returnedApprovals,
    artifacts: expandedArtifacts,
    page_info: {
      next_cursor: nextCursor,
    },
  };
}

export async function listRunArtifacts(
  env: Env,
  tenantId: string,
  runId: string,
  options: RunListQueryOptions = {},
): Promise<{
  items: ArtifactRow[];
  page_info: {
    next_cursor: string | null;
  };
}> {
  const pageSize = options.pageSize ?? DEFAULT_GRAPH_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new ApiError(400, "invalid_request", "page_size must be a positive integer");
  }

  const cursorState = parseRunListCursor(options.cursor, "artifact");
  const result = await env.DB.prepare(
    `SELECT artifact_id, run_id, step_id, artifact_type, mime_type, r2_key, sha256, size_bytes, created_at
       FROM artifacts
      WHERE tenant_id = ?1 AND run_id = ?2
      ORDER BY created_at ASC, artifact_id ASC
      LIMIT ?3 OFFSET ?4`,
  )
    .bind(tenantId, runId, pageSize + 1, cursorState.offset)
    .run();

  const items = ((result.results ?? []) as unknown as ArtifactRow[]).slice(0, pageSize);
  const hasMore = (result.results ?? []).length > pageSize;
  return {
    items,
    page_info: {
      next_cursor: hasMore ? encodeRunListCursor({ offset: cursorState.offset + items.length }) : null,
    },
  };
}

export async function getArtifact(
  env: Env,
  tenantId: string,
  runId: string,
  artifactId: string,
): Promise<ArtifactRow | null> {
  return env.DB.prepare(
    `SELECT artifact_id, run_id, step_id, artifact_type, mime_type, r2_key, sha256, size_bytes, created_at
       FROM artifacts
      WHERE tenant_id = ?1 AND run_id = ?2 AND artifact_id = ?3`,
  )
    .bind(tenantId, runId, artifactId)
    .first<ArtifactRow>();
}

function encodeRunGraphCursor(state: RunGraphCursorState): string {
  return encodeURIComponent(JSON.stringify(state));
}

function encodeRunListCursor(state: RunListCursorState): string {
  return encodeURIComponent(JSON.stringify(state));
}

function parseRunGraphCursor(cursor: string | null | undefined): RunGraphCursorState {
  if (cursor === undefined || cursor === null || cursor === "") {
    return {
      step_offset: 0,
      approval_offset: 0,
      artifact_offset: 0,
    };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cursor)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid cursor");
    }

    const candidate = parsed as {
      step_offset: unknown;
      approval_offset?: unknown;
      artifact_offset: unknown;
    };
    const stepOffset = candidate.step_offset;
    const approvalOffset = candidate.approval_offset ?? 0;
    const artifactOffset = candidate.artifact_offset;
    if (
      typeof stepOffset !== "number" ||
      typeof approvalOffset !== "number" ||
      typeof artifactOffset !== "number" ||
      !Number.isInteger(stepOffset) ||
      !Number.isInteger(approvalOffset) ||
      !Number.isInteger(artifactOffset) ||
      stepOffset < 0 ||
      approvalOffset < 0 ||
      artifactOffset < 0
    ) {
      throw new Error("invalid cursor");
    }

    return {
      step_offset: stepOffset,
      approval_offset: approvalOffset,
      artifact_offset: artifactOffset,
    };
  } catch {
    throw new ApiError(400, "invalid_request", "cursor must be a valid graph cursor");
  }
}

function parseRunListCursor(
  cursor: string | null | undefined,
  resourceName: "artifact" | "event",
): RunListCursorState {
  if (cursor === undefined || cursor === null || cursor === "") {
    return {
      offset: 0,
    };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cursor)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid cursor");
    }
    const candidate = parsed as { offset: unknown };
    if (
      typeof candidate.offset !== "number" ||
      !Number.isInteger(candidate.offset) ||
      candidate.offset < 0
    ) {
      throw new Error("invalid cursor");
    }
    return {
      offset: candidate.offset,
    };
  } catch {
    throw new ApiError(400, "invalid_request", `cursor must be a valid ${resourceName} cursor`);
  }
}

async function expandRunGraphArtifact(
  env: Env,
  artifact: ArtifactRow,
): Promise<RunGraphArtifactRow> {
  const object = await env.ARTIFACTS_BUCKET.get(artifact.r2_key);
  if (!object) {
    throw new ApiError(500, "internal_error", "Artifact body is missing from storage");
  }

  return {
    ...artifact,
    body: parseArtifactBody(artifact.mime_type, await object.text()),
  };
}

function parseArtifactBody(mimeType: string, raw: string): unknown {
  if (mimeType.includes("json")) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function getIdempotencyRecord(
  env: Env,
  tenantId: string,
  routeKey: string,
  idempotencyKey: string,
): Promise<IdempotencyRecordRow | null> {
  return env.DB.prepare(
    `SELECT resource_id, payload_hash
       FROM idempotency_records
      WHERE tenant_id = ?1 AND route_key = ?2 AND idempotency_key = ?3`,
  )
    .bind(tenantId, routeKey, idempotencyKey)
    .first<IdempotencyRecordRow>();
}

export async function putIdempotencyRecord(args: {
  env: Env;
  tenantId: string;
  routeKey: string;
  idempotencyKey: string;
  payloadHash: string;
  resourceType: string;
  resourceId: string;
}): Promise<void> {
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await args.env.DB.prepare(
    `INSERT INTO idempotency_records (
        record_id, tenant_id, route_key, idempotency_key, payload_hash, resource_type, resource_id, created_at, expires_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      createId("idem"),
      args.tenantId,
      args.routeKey,
      args.idempotencyKey,
      args.payloadHash,
      args.resourceType,
      args.resourceId,
      timestamp,
      expiresAt,
    )
    .run();
}

export async function getCoordinatorState(
  env: Env,
  runId: string,
): Promise<RunCoordinatorState | null> {
  const stub = env.RUN_COORDINATOR.get(env.RUN_COORDINATOR.idFromName(runId));
  const response = await stub.fetch("https://run-coordinator.internal/state");
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as RunCoordinatorState;
}

export async function getToolProvider(
  env: Env,
  tenantId: string,
  toolProviderId: string,
): Promise<ToolProviderRow | null> {
  return env.DB.prepare(
    `SELECT tool_provider_id, tenant_id, name, provider_type, endpoint_url, auth_ref,
            visibility_policy_ref, execution_policy_ref, status, created_at, updated_at
       FROM tool_providers
      WHERE tenant_id = ?1 AND tool_provider_id = ?2`,
  )
    .bind(tenantId, toolProviderId)
    .first<ToolProviderRow>();
}

export async function listToolProviders(
  env: Env,
  tenantId: string,
  status?: ToolProviderStatus,
): Promise<ToolProviderRow[]> {
  const query =
    status === undefined
      ? `SELECT tool_provider_id, tenant_id, name, provider_type, endpoint_url, auth_ref,
                visibility_policy_ref, execution_policy_ref, status, created_at, updated_at
           FROM tool_providers
          WHERE tenant_id = ?1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END ASC, updated_at DESC, tool_provider_id ASC`
      : `SELECT tool_provider_id, tenant_id, name, provider_type, endpoint_url, auth_ref,
                visibility_policy_ref, execution_policy_ref, status, created_at, updated_at
           FROM tool_providers
          WHERE tenant_id = ?1 AND status = ?2
          ORDER BY updated_at DESC, tool_provider_id ASC`;

  const result =
    status === undefined
      ? await env.DB.prepare(query).bind(tenantId).run()
      : await env.DB.prepare(query).bind(tenantId, status).run();

  return ((result.results ?? []) as unknown) as ToolProviderRow[];
}

export async function listActivePolicies(
  env: Env,
  tenantId: string,
  channel: string,
  toolProviderId: string,
): Promise<PolicyRow[]> {
  const result = await env.DB.prepare(
    `SELECT policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
            priority, status, conditions_json, approval_config_json, created_at, updated_at
       FROM policies
      WHERE tenant_id = ?1
        AND channel = ?2
        AND status = 'active'
        AND (tool_provider_id IS NULL OR tool_provider_id = ?3)
      ORDER BY priority DESC, updated_at DESC, policy_id ASC`,
  )
    .bind(tenantId, channel, toolProviderId)
    .run();

  return ((result.results ?? []) as unknown) as PolicyRow[];
}

export async function getPolicy(
  env: Env,
  tenantId: string,
  policyId: string,
): Promise<PolicyRow | null> {
  return env.DB.prepare(
    `SELECT policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
            priority, status, conditions_json, approval_config_json, created_at, updated_at
       FROM policies
      WHERE tenant_id = ?1 AND policy_id = ?2`,
  )
    .bind(tenantId, policyId)
    .first<PolicyRow>();
}

export async function listPolicies(
  env: Env,
  tenantId: string,
  status?: "active" | "disabled",
): Promise<PolicyRow[]> {
  const query =
    status === undefined
      ? `SELECT policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
                priority, status, conditions_json, approval_config_json, created_at, updated_at
           FROM policies
          WHERE tenant_id = ?1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END ASC, priority DESC, updated_at DESC, policy_id ASC`
      : `SELECT policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
                priority, status, conditions_json, approval_config_json, created_at, updated_at
           FROM policies
          WHERE tenant_id = ?1 AND status = ?2
          ORDER BY priority DESC, updated_at DESC, policy_id ASC`;

  const result =
    status === undefined
      ? await env.DB.prepare(query).bind(tenantId).run()
      : await env.DB.prepare(query).bind(tenantId, status).run();

  return ((result.results ?? []) as unknown) as PolicyRow[];
}
