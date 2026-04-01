import { resolveAuthHeaders } from "../lib/auth.js";
import { createId, nowIso } from "../lib/ids.js";
import type { A2AMessageSendRequest, OutboundA2ADispatchConfig } from "../types.js";

export interface OutboundDispatchResult {
  taskId: string;
  remoteTaskId: string;
  status: "pending" | "in_progress" | "completed";
  remoteMessageId?: string;
  resolvedEndpointUrl?: string;
  agentCardUrl?: string;
  usedAgentCard?: boolean;
}

interface CachedRemoteAgentCard {
  expiresAt: number;
  agentCardUrl: string;
  messageSendUrl: string | null;
}

const REMOTE_AGENT_CARD_CACHE_TTL_MS = 5 * 60 * 1000;
const remoteAgentCardCache = new Map<string, CachedRemoteAgentCard>();

export async function dispatchOutboundTask(args: {
  env: Env;
  tenantId: string;
  runId: string;
  traceId: string;
  subjectId: string;
  config: OutboundA2ADispatchConfig;
}): Promise<OutboundDispatchResult> {
  const taskId = createId("task");
  const remoteTaskId = args.config.task_id ?? createId("remote_task");
  const timestamp = nowIso();
  const message: A2AMessageSendRequest = {
    task_id: remoteTaskId,
    message_id: createId("msg"),
    sender: {
      agent_id: "agent_control_plane",
    },
    target: {
      agent_id: args.config.agent_id,
    },
    content: {
      type: "text",
      text: args.config.message_text ?? `Dispatch from run ${args.runId}`,
    },
    metadata: {
      ...(args.config.metadata ?? {}),
      origin_run_id: args.runId,
      origin_trace_id: args.traceId,
    },
  };

  const responsePayload =
    args.config.endpoint_url.startsWith("mock://") || args.config.endpoint_url.startsWith("demo://")
      ? {
          payload: buildMockOutboundResponse(remoteTaskId, args.config.agent_id),
          resolvedEndpointUrl: args.config.endpoint_url,
          agentCardUrl: null,
          usedAgentCard: false,
        }
      : await postRemoteTask({
          env: args.env,
          endpointUrl: args.config.endpoint_url,
          authRef: args.config.auth_ref ?? null,
          tenantId: args.tenantId,
          traceId: args.traceId,
          idempotencyKey: `a2a-outbound:${args.runId}:${args.config.tool_provider_id ?? args.config.agent_id}`,
          body: message,
        });

  const remoteStatus = normalizeRemoteStatus(responsePayload.payload.status);

  await args.env.DB.prepare(
    `INSERT INTO a2a_tasks (
        task_id, tenant_id, run_id, direction, remote_task_id, remote_agent_id, remote_endpoint_url,
        last_remote_message_id, status, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
  )
    .bind(
      taskId,
      args.tenantId,
      args.runId,
      "outbound",
      remoteTaskId,
      args.config.agent_id,
      responsePayload.resolvedEndpointUrl,
      typeof responsePayload.payload.message_id === "string" ? responsePayload.payload.message_id : message.message_id ?? null,
      remoteStatus,
      timestamp,
    )
    .run();

  return {
    taskId,
    remoteTaskId,
    status: remoteStatus,
    ...(typeof responsePayload.payload.message_id === "string"
      ? { remoteMessageId: responsePayload.payload.message_id }
      : {}),
    resolvedEndpointUrl: responsePayload.resolvedEndpointUrl,
    ...(responsePayload.agentCardUrl ? { agentCardUrl: responsePayload.agentCardUrl } : {}),
    usedAgentCard: responsePayload.usedAgentCard,
  };
}

async function postRemoteTask(args: {
  env: Env;
  endpointUrl: string;
  authRef: string | null;
  tenantId: string;
  traceId: string;
  idempotencyKey: string;
  body: A2AMessageSendRequest;
}): Promise<{
  payload: Record<string, unknown>;
  resolvedEndpointUrl: string;
  agentCardUrl: string | null;
  usedAgentCard: boolean;
}> {
  const remoteTarget = await resolveRemoteMessageSendTarget(args);
  const headers = resolveAuthHeaders(args.env, args.authRef);
  headers.set("content-type", "application/json");
  headers.set("x-tenant-id", args.tenantId);
  headers.set("x-trace-id", args.traceId);
  headers.set("idempotency-key", args.idempotencyKey);

  const response = await fetch(remoteTarget.messageSendUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(args.body),
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`Remote A2A dispatch failed with status ${response.status}`);
  }

  return {
    payload: (await response.json()) as Record<string, unknown>,
    resolvedEndpointUrl: remoteTarget.messageSendUrl,
    agentCardUrl: remoteTarget.agentCardUrl,
    usedAgentCard: remoteTarget.usedAgentCard,
  };
}

function buildMockOutboundResponse(
  remoteTaskId: string,
  agentId: string,
): Record<string, unknown> {
  return {
    accepted: true,
    task_id: remoteTaskId,
    status: "in_progress",
    agent_id: agentId,
    message_id: createId("msg"),
  };
}

function normalizeRemoteStatus(value: unknown): "pending" | "in_progress" | "completed" {
  if (value === "pending") {
    return "pending";
  }
  if (value === "completed") {
    return "completed";
  }
  return "in_progress";
}

async function resolveRemoteMessageSendTarget(args: {
  env: Env;
  endpointUrl: string;
  authRef: string | null;
}): Promise<{
  messageSendUrl: string;
  agentCardUrl: string | null;
  usedAgentCard: boolean;
}> {
  const card = await getRemoteAgentCard(args);
  if (!card) {
    return {
      messageSendUrl: args.endpointUrl,
      agentCardUrl: null,
      usedAgentCard: false,
    };
  }
  if (!card.messageSendUrl) {
    throw new Error("Remote agent card is missing a valid same-origin endpoints.message_send");
  }

  return {
    messageSendUrl: card.messageSendUrl,
    agentCardUrl: card.agentCardUrl,
    usedAgentCard: true,
  };
}

async function getRemoteAgentCard(args: {
  env: Env;
  endpointUrl: string;
  authRef: string | null;
}): Promise<CachedRemoteAgentCard | null> {
  let cardUrl: string;
  try {
    cardUrl = new URL("/.well-known/agent-card.json", args.endpointUrl).toString();
  } catch {
    return null;
  }
  const expectedOrigin = new URL(args.endpointUrl).origin;

  const cached = remoteAgentCardCache.get(cardUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const headers = resolveAuthHeaders(args.env, args.authRef);
  headers.set("accept", "application/json");

  try {
    const response = await fetch(cardUrl, {
      method: "GET",
      headers,
      redirect: "manual",
    });
    if (!response.ok) {
      return null;
    }
    const effectiveCardUrl = resolveEffectiveCardUrl(response.url, cardUrl);
    if (new URL(effectiveCardUrl).origin !== expectedOrigin) {
      return null;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const messageSendUrl = extractMessageSendUrl(payload, effectiveCardUrl, expectedOrigin);
    const nextValue: CachedRemoteAgentCard = {
      expiresAt: Date.now() + REMOTE_AGENT_CARD_CACHE_TTL_MS,
      agentCardUrl: effectiveCardUrl,
      messageSendUrl,
    };
    remoteAgentCardCache.set(cardUrl, nextValue);
    return nextValue;
  } catch {
    return null;
  }
}

function extractMessageSendUrl(
  payload: Record<string, unknown>,
  cardUrl: string,
  expectedOrigin: string,
): string | null {
  const endpoints =
    payload.endpoints && typeof payload.endpoints === "object" && !Array.isArray(payload.endpoints)
      ? (payload.endpoints as Record<string, unknown>)
      : null;
  const messageSend = endpoints?.message_send;
  if (typeof messageSend !== "string" || messageSend.trim() === "") {
    return null;
  }

  try {
    const resolvedUrl = new URL(messageSend, cardUrl);
    if (resolvedUrl.origin !== expectedOrigin) {
      return null;
    }
    return resolvedUrl.toString();
  } catch {
    return null;
  }
}

function resolveEffectiveCardUrl(responseUrl: string, fallbackUrl: string): string {
  if (typeof responseUrl === "string" && responseUrl.trim() !== "") {
    return responseUrl;
  }
  return fallbackUrl;
}
