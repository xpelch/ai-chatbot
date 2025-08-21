import { NextRequest } from "next/server";

const COOKIE_NAME = "app_auth";
const PASSWORD = "project_block";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const ok = body.password === PASSWORD;
  if (!ok) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json" } });

  const res = new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=ok; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  return res;
}
