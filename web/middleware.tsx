import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Placeholder for future auth/logging logic.
  return NextResponse.next();
}
