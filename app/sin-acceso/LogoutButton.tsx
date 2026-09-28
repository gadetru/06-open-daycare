"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, startLogout] = useTransition();

  function handleLogout() {
    startLogout(async () => {
      await logout();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="block w-full scroll-mb-2 rounded-[15px] bg-gradient-to-b from-accent-1 to-accent-2 p-[15px] text-center text-[16px] font-extrabold text-[#1F1814] shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F1814] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
