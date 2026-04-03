import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  return (
    process.env.CONTROL_PLANE_BASE_URL ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ??
    ""
  ).replace(/\/$/, "");
}

function getFallbackSubjectId(): string {
  return (
    process.env.CONTROL_PLANE_SUBJECT_ID ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_SUBJECT_ID ??
    "codex@local"
  );
}

function getFallbackSubjectRoles(): string {
  return (
    process.env.CONTROL_PLANE_SUBJECT_ROLES ??
    process.env.NEXT_PUBLIC_CONTROL_PLANE_SUBJECT_ROLES ??
    "platform_admin"
  );
}

export async function POST(request: Request) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Response.json(
      {
        error: {
          code: "control_plane_base_missing",
          message: "CONTROL_PLANE_BASE_URL is not configured",
        },
      },
      { status: 503 },
    );
  }

  const requestHeaders = await headers();
  const body = await request.text();
  const subjectId =
    requestHeaders.get("x-authenticated-subject") ??
    requestHeaders.get("cf-access-authenticated-user-email") ??
    getFallbackSubjectId();
  const subjectRoles =
    requestHeaders.get("x-authenticated-roles") ??
    requestHeaders.get("cf-access-authenticated-user-groups") ??
    getFallbackSubjectRoles();

  const upstream = await fetch(`${baseUrl}/api/v1/saas/invitations:accept`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "idempotency-key": `web-${crypto.randomUUID()}`,
      "x-authenticated-subject": subjectId,
      "x-authenticated-roles": subjectRoles,
    },
    body,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
