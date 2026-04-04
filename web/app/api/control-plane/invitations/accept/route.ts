import { headers } from "next/headers";
import { proxyAuthenticatedPostRequest } from "../../post-route-helpers";

export const dynamic = "force-dynamic";

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
  const requestHeaders = await headers();
  const subjectId =
    requestHeaders.get("x-authenticated-subject") ??
    requestHeaders.get("cf-access-authenticated-user-email") ??
    getFallbackSubjectId();
  const subjectRoles =
    requestHeaders.get("x-authenticated-roles") ??
    requestHeaders.get("cf-access-authenticated-user-groups") ??
    getFallbackSubjectRoles();

  return proxyAuthenticatedPostRequest({
    request,
    path: "/api/v1/saas/invitations:accept",
    subjectId,
    subjectRoles,
    contentType: "application/json",
  });
}
