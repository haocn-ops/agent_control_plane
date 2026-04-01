import { DurableObject } from "cloudflare:workers";
import type { ApprovalDecisionSignal } from "../types.js";

interface ApprovalSessionState {
  approval_id: string;
  run_id: string;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  decision: ApprovalDecisionSignal | null;
}

export class ApprovalSession extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/init") {
      const payload = (await request.json()) as ApprovalSessionState;
      await this.ctx.storage.put("state", payload);
      return new Response(null, { status: 204 });
    }

    if (request.method === "POST" && url.pathname === "/decide") {
      const current = await this.readState();
      if (current.status !== "pending") {
        return Response.json(current, { status: 409 });
      }

      const signal = (await request.json()) as ApprovalDecisionSignal;
      const nextState: ApprovalSessionState = {
        ...current,
        status: signal.decision,
        decision: signal,
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "POST" && url.pathname === "/expire") {
      const current = await this.readState();
      if (current.status !== "pending") {
        return Response.json(current, { status: 409 });
      }

      const nextState: ApprovalSessionState = {
        ...current,
        status: "expired",
        decision: null,
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "POST" && url.pathname === "/cancel") {
      const current = await this.readState();
      if (current.status !== "pending") {
        return Response.json(current, { status: 409 });
      }

      const nextState: ApprovalSessionState = {
        ...current,
        status: "cancelled",
        decision: null,
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const state = await this.ctx.storage.get<ApprovalSessionState>("state");
      if (!state) {
        return new Response(null, { status: 404 });
      }
      return Response.json(state);
    }

    return new Response("Not found", { status: 404 });
  }

  private async readState(): Promise<ApprovalSessionState> {
    const state = await this.ctx.storage.get<ApprovalSessionState>("state");
    if (!state) {
      throw new Error("Approval session state was not initialized");
    }
    return state;
  }
}
