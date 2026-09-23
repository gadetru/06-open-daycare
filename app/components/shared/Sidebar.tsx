"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type SVGProps } from "react";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/client";
import SunIcon from "./SunIcon";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onNewPost?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type SessionUser = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

const navItems: NavItem[] = [
  { label: "Feed", href: "/", icon: FeedIcon },
  { label: "Niños", href: "/kids", icon: ChildrenIcon },
  { label: "Avisos", href: "/avisos", icon: BellIcon },
  { label: "Mi cuenta", href: "/mi-cuenta", icon: UserIcon },
];

export default function Sidebar({ isOpen, onClose, onNewPost }: SidebarProps) {
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
          href="/"
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
            <div className="mt-0.5 text-[11.5px] text-ink-soft">Sala Soles</div>
          </div>
        </Link>

        {onNewPost ? (
          <button
            type="button"
            onClick={onNewPost}
            className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-accent-1 to-accent-2 px-3 py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]"
          >
            <PlusIcon />
            Nueva publicación
          </button>
        ) : (
          <Link
            href="/crear-publicacion"
            onClick={onClose}
            className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-accent-1 to-accent-2 px-3 py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]"
          >
            <PlusIcon />
            Nueva publicación
          </Link>
        )}

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] ${
                  isActive
                    ? "bg-accent-soft font-extrabold text-primary"
                    : "bg-transparent font-semibold text-[#6e6359]"
                }`}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
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

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
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

function ChildrenIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9" />
    </svg>
  );
}

function BellIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function UserIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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