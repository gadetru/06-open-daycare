"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import FamiliaNav from "./FamiliaNav";
import FamilyFeedHeader from "./FamilyFeedHeader";
import PostCard from "../shared/PostCard";
import type { PostDayGroup } from "@/app/lib/posts-utils";

type FamiliaClientProps = {
  parentName: string | null;
  childNames: string[];
  daycareName: string | null;
  todayLabel: string;
  dayGroups: PostDayGroup[];
  notice: string | null;
  hasLinkedChildren: boolean;
};

export default function FamiliaClient({
  parentName,
  childNames,
  daycareName,
  todayLabel,
  dayGroups,
  notice,
  hasLinkedChildren,
}: FamiliaClientProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="flex min-h-full bg-background">
      <FamiliaNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

      {!isNavOpen && (
        <button
          onClick={() => setIsNavOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-ink lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
      )}

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-[34px] sm:px-10">
          <FamilyFeedHeader
            parentName={parentName}
            childNames={childNames}
            daycareName={daycareName}
            todayLabel={todayLabel}
          />

          {notice && (
            <p
              role="alert"
              className="mb-[18px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[13.5px] font-semibold text-error-text"
            >
              {notice}
            </p>
          )}

          {!hasLinkedChildren && !notice && <EmptyNoLinks />}

          {hasLinkedChildren && dayGroups.length === 0 && !notice && (
            <EmptyNoPosts childNames={childNames} />
          )}

          {dayGroups.map((dayGroup) => (
            <section key={dayGroup.dayKey} className="mb-[22px]">
              <div className="mb-[14px] flex items-center gap-[14px]">
                <span className="text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
                  {dayGroup.label.toUpperCase()}
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>

              <div className="flex flex-col gap-4">
                {dayGroup.posts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

// Padre sin vínculos: mensaje sin errores ni redirects.
function EmptyNoLinks() {
  return (
    <section className="rounded-[18px] border border-border bg-surface px-6 py-10 text-center">
      <p className="font-heading text-[19px] font-semibold text-ink">
        Todavía no hay novedades
      </p>
      <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-ink-muted">
        Cuando la guardería vincule a tu hijo o hija, sus momentos van a
        aparecer acá.
      </p>
    </section>
  );
}

// Padre con vínculos pero sin posts visibles.
function EmptyNoPosts({ childNames }: { childNames: string[] }) {
  const firstName =
    childNames.length > 0 ? childNames[0].split(" ")[0] : null;
  return (
    <section className="rounded-[18px] border border-border bg-surface px-6 py-10 text-center">
      <p className="font-heading text-[19px] font-semibold text-ink">
        Todavía no hay publicaciones
      </p>
      <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-ink-muted">
        {firstName
          ? `Cuando compartan un momento de ${firstName}, va a aparecer acá.`
          : "Cuando compartan un momento, va a aparecer acá."}
      </p>
    </section>
  );
}

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
