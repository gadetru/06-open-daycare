"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginSuccessBanner() {
  const searchParams = useSearchParams();
  const justActivated = searchParams.get("activated") === "1";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!justActivated || dismissed) return;
    function hideBanner() {
      setDismissed(true);
    }
    window.addEventListener("input", hideBanner);
    window.addEventListener("keydown", hideBanner);
    return () => {
      window.removeEventListener("input", hideBanner);
      window.removeEventListener("keydown", hideBanner);
    };
  }, [justActivated, dismissed]);

  useEffect(() => {
    if (justActivated) setDismissed(false);
  }, [justActivated]);

  if (!justActivated || dismissed) {
    return null;
  }

  return (
    <div className="mb-[18px] mt-[-10px] flex items-center gap-[10px] rounded-[12px] bg-success-bg px-4 py-[12px]">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-success"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <p className="text-[13.5px] font-semibold text-success">
        Tu cuenta fue activada. Ingresá con tu email y contraseña.
      </p>
    </div>
  );
}