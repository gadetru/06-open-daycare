"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import Sidebar from "../components/shared/Sidebar";
import KidCard from "../components/kids/KidCard";
import AddKidModal from "../components/kids/AddKidModal";
import type { Kid } from "../data/kids";
import { childRowToKid, type NewChildFields } from "../lib/kids-utils";

export type RoomGroup = {
  id: string;
  name: string;
  kids: Kid[];
};

type KidsClientProps = {
  rooms: RoomGroup[];
  notice?: string | null;
};

export default function KidsClient({ rooms, notice }: KidsClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addedKids, setAddedKids] = useState<Kid[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const groupsWithNew = rooms.map((group) => ({
    ...group,
    kids: [
      ...group.kids,
      ...addedKids.filter((kid) => kid.room === group.name),
    ],
  }));
  const totalKids = groupsWithNew.reduce(
    (total, group) => total + group.kids.length,
    0,
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const visibleGroups = trimmedQuery
    ? groupsWithNew
        .map((group) => ({
          ...group,
          kids: group.kids.filter((kid) =>
            kid.name.toLowerCase().includes(trimmedQuery),
          ),
        }))
        .filter((group) => group.kids.length > 0)
    : groupsWithNew;

  function handleSaveKid(fields: NewChildFields) {
    const roomName = rooms.find((group) => group.id === fields.roomId)?.name ?? "";
    const tempKid = childRowToKid(
      {
        id: `temp-${addedKids.length}-${fields.roomId}`,
        room_id: fields.roomId,
        room_name: roomName,
        full_name: fields.fullName,
        birth_date: fields.birthDate,
        enrolled_at: fields.enrolledAt,
        medical_notes: fields.medicalNotes,
        allergy_tags: fields.allergyTags,
        photo_consent: fields.photoConsent,
      },
      totalKids,
    );
    setAddedKids((current) => [...current, tempKid]);
    setIsModalOpen(false);
  }

  return (
    <div className="flex min-h-full bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-ink lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
      )}

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-6 pb-20 pt-[34px] sm:px-10">
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-primary">
                GESTIÓN
              </div>
              <h1 className="m-0 font-heading text-[30px] font-semibold leading-none text-ink">
                Niños
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-[14px] bg-gradient-to-b from-accent-1 to-accent-2 px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)]"
            >
              <PlusIcon />
              Agregar niño
            </button>
          </div>

          <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
            <SearchIcon />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar niño…"
              className="flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
            />
          </div>

          {notice && (
            <div
              role="alert"
              className="mb-[22px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[14px] font-semibold text-error-text"
            >
              {notice}
            </div>
          )}

          <div className="space-y-[28px]">
            {visibleGroups.map((group) => (
              <div key={group.id}>
                <div className="mb-[14px] flex items-center gap-3">
                  <span className="text-[12.5px] font-extrabold tracking-[.8px] text-ink">
                    SALA {group.name.toUpperCase()} · {group.kids.length}{" "}
                    {group.kids.length === 1 ? "niño" : "niños"}
                  </span>
                  <span className="h-px flex-1 bg-divider" />
                </div>

                {group.kids.length > 0 ? (
                  <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                    {group.kids.map((kid) => (
                      <KidCard key={kid.id} kid={kid} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[14px] border border-dashed border-border bg-surface px-4 py-5 text-center text-[14px] text-ink-soft">
                    Todavía no hay niños en esta sala.
                  </p>
                )}
              </div>
            ))}

            {trimmedQuery && visibleGroups.length === 0 && (
              <p className="rounded-[14px] border border-dashed border-border bg-surface px-4 py-5 text-center text-[14px] text-ink-soft">
                Sin resultados para “{searchQuery.trim()}”.
              </p>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <AddKidModal
          isOpen={isModalOpen}
          rooms={rooms.map((group) => ({ id: group.id, name: group.name }))}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveKid}
        />
      )}
    </div>
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

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
