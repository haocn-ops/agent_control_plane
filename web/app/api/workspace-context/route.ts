import { NextResponse } from "next/server";

import {
  WORKSPACE_COOKIE_NAME,
  isWorkspaceContextFallbackSource,
  resolveCookieWorkspaceFromRawCookie,
  resolveWorkspaceContextFromRequest,
  resolveWorkspaceContextFromValues,
} from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function applyContextHeaders(
  response: NextResponse,
  source: string,
  isFallback: boolean,
  warning: string | null,
): void {
  response.headers.set("x-govrail-workspace-context-source", source);
  response.headers.set("x-govrail-workspace-context-fallback", isFallback ? "1" : "0");
  if (warning) {
    response.headers.set("x-govrail-workspace-context-warning", warning);
  }
}

function getPreferredSubjectId(request: Request): string | null {
  return (
    request.headers.get("x-authenticated-subject") ??
    request.headers.get("cf-access-authenticated-user-email") ??
    null
  );
}

function getPreferredSubjectRoles(request: Request): string | null {
  return (
    request.headers.get("x-authenticated-roles") ??
    request.headers.get("cf-access-authenticated-user-groups") ??
    null
  );
}

export async function GET(request: Request) {
  const context = await resolveWorkspaceContextFromRequest(request);
  const response = NextResponse.json({
    data: context,
    meta: {
      request_id: "workspace-context",
      trace_id: "workspace-context",
    },
  });
  applyContextHeaders(
    response,
    context.source,
    isWorkspaceContextFallbackSource(context.source),
    context.source_detail.warning,
  );
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    workspace_id?: string;
    workspace_slug?: string;
  };

  const context = await resolveWorkspaceContextFromValues({
    requestedWorkspaceId: body.workspace_id ?? null,
    requestedWorkspaceSlug: body.workspace_slug ?? null,
    cookieWorkspace: resolveCookieWorkspaceFromRawCookie(request.headers.get("cookie")),
    preferredSubjectId: getPreferredSubjectId(request),
    preferredSubjectRoles: getPreferredSubjectRoles(request),
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
  applyContextHeaders(
    response,
    context.source,
    isWorkspaceContextFallbackSource(context.source),
    context.source_detail.warning,
  );

  return response;
}
