import { proxyControlPlane } from "../../../../lib/control-plane-proxy";

type ProxyControlPlaneFn = typeof proxyControlPlane;

export function buildRunPath(runId: string, suffix?: string): string {
  const base = `/api/v1/runs/${runId}`;
  return suffix ? `${base}${suffix}` : base;
}

function appendSearch(path: string, request: Request): string {
  const search = new URL(request.url).search;
  return search ? `${path}${search}` : path;
}

export async function proxyRunDetailRequest(args: {
  request: Request;
  runId: string;
  suffix?: string;
  proxy?: ProxyControlPlaneFn;
}): Promise<Response> {
  const proxy = args.proxy ?? proxyControlPlane;
  const path = appendSearch(buildRunPath(args.runId, args.suffix), args.request);
  return proxy(path);
}
