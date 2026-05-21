import { NextRequest, NextResponse } from "next/server";
import { ALL_PEOPLE, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }
  await store.ensureHydrated();
  const judge = store.getJudge(id);
  if (!judge) {
    return NextResponse.json({ error: "UNKNOWN_JUDGE" }, { status: 404 });
  }
  return NextResponse.json({ judge });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    guest?: boolean;
  };

  await store.ensureHydrated();

  if (body.guest === true) {
    const judge = await store.createGuest();
    return NextResponse.json({ judge });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }
  const person = ALL_PEOPLE.find((p) => p.name === name);
  if (!person) {
    return NextResponse.json({ error: "UNKNOWN_PERSON" }, { status: 400 });
  }
  const judge = await store.upsertJudgeByName(
    person.name,
    person.teamId,
    person.role,
  );
  return NextResponse.json({ judge });
}
