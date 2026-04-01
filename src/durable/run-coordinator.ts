import { DurableObject } from "cloudflare:workers";
import type { RunCoordinatorState, RunStatus } from "../types.js";

export class RunCoordinator extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/init") {
      const payload = (await request.json()) as RunCoordinatorState;
      await this.ctx.storage.put("state", payload);
      return new Response(null, { status: 204 });
    }

    if (request.method === "POST" && url.pathname === "/step") {
      const current = await this.readState();
      const payload = (await request.json()) as { step_id: string };
      const nextState: RunCoordinatorState = {
        ...current,
        current_step_id: payload.step_id,
        last_sequence_no: current.last_sequence_no + 1,
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "POST" && url.pathname === "/approval") {
      const current = await this.readState();
      const payload = (await request.json()) as { approval_id: string | null };
      const nextState: RunCoordinatorState = {
        ...current,
        pending_approval_id: payload.approval_id,
        status: payload.approval_id ? "waiting_approval" : "running",
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "POST" && url.pathname === "/status") {
      const current = await this.readState();
      const payload = (await request.json()) as { status: RunStatus };
      const nextState: RunCoordinatorState = {
        ...current,
        status: payload.status,
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json(nextState);
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const state = await this.ctx.storage.get<RunCoordinatorState>("state");
      if (!state) {
        return new Response(null, { status: 404 });
      }
      return Response.json(state);
    }

    return new Response("Not found", { status: 404 });
  }

  private async readState(): Promise<RunCoordinatorState> {
    const state = await this.ctx.storage.get<RunCoordinatorState>("state");
    if (!state) {
      throw new Error("Run coordinator state was not initialized");
    }
    return state;
  }
}
