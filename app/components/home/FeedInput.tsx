import Link from "next/link";
import type { SVGProps } from "react";

export default function FeedInput() {
  return (
    <Link
      href="/crear-publicacion"
      className="mb-6 flex items-center gap-[14px] rounded-[18px] border border-border bg-surface px-[18px] py-[14px] shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]"
    >
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent font-heading text-[16px] font-semibold text-white">
        C
      </div>
      <span className="flex-1 text-[15px] text-ink-soft">Compartí un momento…</span>
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] bg-accent-soft text-coral">
        <CameraIcon />
      </span>
    </Link>
  );
}

function CameraIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}