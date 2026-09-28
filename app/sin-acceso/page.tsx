import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import SunIcon from "@/app/components/shared/SunIcon";
import LogoutButton from "./LogoutButton";

// Cuenta autenticada pero sin fila en public.users (huérfana o pendiente de
// vinculación). No redirige: explica el estado y ofrece salidas.
export default async function SinAccesoPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-auth-bg p-10">
      <div className="w-full max-w-[440px] rounded-[20px] border border-border bg-surface px-8 py-10 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gradient-to-br from-[#F8C3A8] to-accent"
        >
          <SunIcon />
        </div>
        <h1 className="font-heading text-[24px] font-semibold text-ink">
          Cuenta sin acceso
        </h1>
        {user?.email && (
          <p className="mt-1 text-[14px] font-semibold text-ink-soft">
            {user.email}
          </p>
        )}
        <p className="mx-auto mt-3 max-w-[36ch] text-[15px] leading-relaxed text-ink-muted">
          Tu cuenta no está vinculada a ninguna guardería. Pedí en tu
          guardería que te envíen una invitación o contactá a quien te registró.
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
        <p className="mt-5 text-center text-[14.5px] text-[#6E6359]">
          ¿Tenés un código de invitación?{" "}
          <Link
            href="/activar-cuenta"
            className="scroll-mb-2 rounded-sm font-extrabold text-[#B94A35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E6359]"
          >
            Activá tu cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
