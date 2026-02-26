import { NextRequest } from "next/server";

export function getPublicOrigin(req: NextRequest): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const proto = forwardedProto || req.nextUrl.protocol.replace(":", "") || "http";

  return `${proto}://${host}`;
}

export function buildPublicUrl(req: NextRequest, path: string): URL {
  return new URL(path, getPublicOrigin(req));
}
