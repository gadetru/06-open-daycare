"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
}
