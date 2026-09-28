"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type SVGProps } from "react";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/client";
import SunIcon from "../shared/SunIcon";

type FamiliaNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SessionUser = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export default function FamiliaNav({ isOpen, onClose }: FamiliaNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isLoggingOut, startLogout] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    async function loadSessionUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSessionUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setSessionUser({
        email: user.email ?? "",
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      });
    }

    loadSessionUser();
  }, []);

  function handleLogout() {
    startLogout(async () => {
      await logout();
      setSessionUser(null);
      router.push("/login");
      router.refresh();
    });
  }

  const displayName = sessionUser?.fullName || sessionUser?.email || "";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  const isHomeActive = pathname === "/familia";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-none flex-col overflow-y-auto border-r border-border bg-surface px-4 py-6 transition-transform duration-300 ease-in-out lg:sticky lg:bottom-auto lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          href="/familia"
          onClick={onClose}
          className="flex items-center gap-[11px] px-2 pb-[22px] pt-1"
        >
          <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] bg-gradient-to-br from-[#F8C3A8] to-accent">
            <SunIcon />
          </div>
          <div>
            <div className="font-heading text-[17px] font-semibold leading-none text-ink">
              OpenDayCare
            </div>
            <div className="mt-0.5 text-[11.5px] text-ink-soft">Familia</div>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          <Link
            href="/familia"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] ${
              isHomeActive
                ? "bg-accent-soft font-extrabold text-primary"
                : "bg-transparent font-semibold text-[#6e6359]"
            }`}
          >
            <FeedIcon />
            Inicio
          </Link>
        </nav>

        {sessionUser && (
          <div className="mt-2.5 border-t border-border pt-[14px]">
            <div className="flex items-center gap-[11px] px-2 py-1.5">
              {sessionUser.avatarUrl ? (
                <img
                  src={sessionUser.avatarUrl}
                  alt={displayName}
                  className="h-[38px] w-[38px] flex-none rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-accent font-heading text-[16px] font-semibold text-white">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-extrabold text-ink">
                  {displayName}
                </div>
                {sessionUser.fullName && (
                  <div className="truncate text-xs text-ink-soft">
                    {sessionUser.email}
                  </div>
                )}
              </div>
              <button
                type="button"
                title="Cerrar sesión"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-background text-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function FeedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
