import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type AppRole = "staff" | "parent" | "admin";

export type SessionRole = {
  userId: string;
  role: AppRole;
};

export type AccountStatus =
  | { status: "anonymous" }
  | { status: "no-profile"; userId: string }
  | { status: "ok"; userId: string; role: AppRole };

// Distingue "sin sesión" de "sesión válida sin fila en public.users" (cuenta
// huérfana). Los guards usan esto para no rebotar en loop /login ↔ /.
export async function getAccountStatus(): Promise<AccountStatus> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string" || userId.length === 0) {
    return { status: "anonymous" };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (userRow as { role: AppRole } | null)?.role;

  if (role !== "staff" && role !== "parent" && role !== "admin") {
    return { status: "no-profile", userId };
  }

  return { status: "ok", userId, role };
}

// Lee la sesión con getClaims (sin confiar en la cookie) y resuelve el rol
// desde public.users. Devuelve null si no hay sesión o no hay fila de usuario.
export async function requireRole(): Promise<SessionRole | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (userRow as { role: AppRole } | null)?.role;

  if (role !== "staff" && role !== "parent" && role !== "admin") {
    return null;
  }

  return { userId, role };
}
