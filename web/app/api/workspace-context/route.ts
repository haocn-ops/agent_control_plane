import { NextResponse } from "next/server";

import {
  WORKSPACE_COOKIE_NAME,
  resolveWorkspaceContextFromRequest,
  resolveWorkspaceContextFromValues,
} from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveWorkspaceContextFromRequest(request);
  return NextResponse.json({
    data: context,
    meta: {
      request_id: "workspace-context",
      trace_id: "workspace-context",
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    workspace_id?: string;
    workspace_slug?: string;
  };

  const context = await resolveWorkspaceContextFromValues({
    requestedWorkspaceId: body.workspace_id ?? null,
    requestedWorkspaceSlug: body.workspace_slug ?? null,
  });
  const response = NextResponse.json({
    data: context,
    meta: {
      request_id: "workspace-context-update",
      trace_id: "workspace-context-update",
    },
  });

  response.cookies.set({
    name: WORKSPACE_COOKIE_NAME,
    value: context.workspace.slug,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
