"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import type { Kid } from "../../data/kids";

type KidCardProps = {
  kid: Kid;
};

export default function KidCard({ kid }: KidCardProps) {
  const parentCountLabel = getParentCountLabel(kid.parents.length);

  return (
    <Link
      href={`/kids/${kid.id}`}
      className="flex items-center gap-[14px] rounded-[18px] border border-border bg-surface px-4 py-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition duration-150 hover:-translate-y-0.5 hover:border-[#F2A78E]"
    >
      <div
        className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
        style={{ backgroundColor: kid.avatarBg, color: kid.avatarInk }}
      >
        {kid.initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-heading text-[16px] font-semibold text-ink">
          {kid.name}
        </div>
        <div className="text-[13px] text-ink-soft">
          {kid.age} años · {parentCountLabel}
        </div>
      </div>

      {kid.allergyBadge ? (
        <span className="flex-none rounded-full bg-badge-mani-bg px-[9px] py-[5px] text-[11px] font-extrabold text-badge-mani-ink">
          {kid.allergyBadge.label}
        </span>
      ) : kid.parents.length === 0 ? (
        <span className="flex-none rounded-full bg-badge-vincular-bg px-[9px] py-[5px] text-[11px] font-extrabold text-badge-vincular-ink">
          VINCULAR
        </span>
      ) : (
        <ChevronIcon />
      )}
    </Link>
  );
}

function getParentCountLabel(total: number): string {
  if (total === 0) return "sin padres vinculados";
  return `${total} ${total === 1 ? "padre vinculado" : "padres vinculados"}`;
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none text-chevron"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}