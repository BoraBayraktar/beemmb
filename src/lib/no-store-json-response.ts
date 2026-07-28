import { NextResponse } from "next/server";

export function buildNoStoreHeaders() {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: buildNoStoreHeaders(),
  });
}
