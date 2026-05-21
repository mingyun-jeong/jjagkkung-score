import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polled by the dashboard / admin / judge clients at 1Hz. ensureHydrated
// re-reads team_averages each call so this is always DB-fresh.
export async function GET() {
  await store.ensureHydrated();
  return NextResponse.json(store.snapshot());
}
