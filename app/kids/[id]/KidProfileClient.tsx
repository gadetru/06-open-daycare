"use client";

import { useCallback, useState } from "react";
import type { SVGProps } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/shared/Sidebar";
import SunIcon from "../../components/shared/SunIcon";
import AddKidModal from "../../components/kids/AddKidModal";
import type { RoomOption } from "../../components/kids/AddKidModal";
import LinkParentModal from "../../components/kids/LinkParentModal";
import type { Kid } from "../../data/kids";
import {
  buildParentRows,
  childRowToKid,
  getInitial,
} from "../../lib/kids-utils";
import type {
  AcceptedParentRow,
  ChildRow,
  NewChildFields,
  ParentRowData,
  PendingInvitationRow,
} from "../../lib/kids-utils";
import { createClient } from "@/utils/supabase/client";

type KidProfileClientProps = {
  child: ChildRow | null;
  rooms: RoomOption[];
  notice: string | null;
  pendingInvitations: PendingInvitationRow[];
  acceptedParents: AcceptedParentRow[];
};

export default function KidProfileClient({
  child,
  rooms,
  notice,
  pendingInvitations,
  acceptedParents,
}: KidProfileClientProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const kid = child ? childRowToKid(child, 0) : null;
  const kidFirstName = kid?.name.split(" ")[0] ?? "";
  const parentRows = buildParentRows(pendingInvitations, acceptedParents);

  function openSidebar() {
    setIsSidebarOpen(true);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function openEditModal() {
    setIsEditing(true);
  }

  function openLinkModal() {
    setIsLinkModalOpen(true);
  }

  const closeEditModal = useCallback(() => {
    setSaveError(null);
    setIsEditing(false);
  }, []);

  const closeLinkModal = useCallback(() => {
    setIsLinkModalOpen(false);
  }, []);

  async function handleSaveKid(fields: NewChildFields) {
    if (!child) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("children")
        .update({
          full_name: fields.fullName,
          birth_date: fields.birthDate,
          room_id: fields.roomId,
          allergy_tags: fields.allergyTags,
          medical_notes: fields.medicalNotes ? fields.medicalNotes : null,
          enrolled_at: fields.enrolledAt,
          photo_consent: fields.photoConsent,
        })
        .eq("id", child.id);

      if (error) {
        throw error;
      }
      setIsEditing(false);
      router.refresh();
    } catch {
      setSaveError("No se pudo guardar, reintentá");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-full bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={openSidebar}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-ink lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
      )}

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-[34px] sm:px-10">
          <Link
            href="/kids"
            className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-ink-muted"
          >
            <ChevronLeftIcon />
            Volver a Niños
          </Link>

          {notice && (
            <div
              role="alert"
              className="mb-[22px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[14px] font-semibold text-error-text"
            >
              {notice}
            </div>
          )}

          {kid ? (
            <div className="flex flex-wrap items-start gap-[26px]">
              <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
                <KidHeader kid={kid} onEdit={openEditModal} />

                <KidNotesPanel note={kid.note} />

                <dl className="overflow-hidden rounded-[16px] border border-border bg-surface">
                  <InfoRow
                    label="Fecha de nacimiento"
                    value={kid.birthDate}
                    divider
                  />
                  <InfoRow label="Sala" value={kid.room} divider />
                  <InfoRow label="Ingreso" value={kid.enrolledDate} />
                </dl>
              </div>

              <div className="flex w-full flex-none flex-col gap-[14px] lg:w-[300px]">
                <Link
                  href="/resumen-dia"
                  className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink px-4 py-[13px] text-[15px] font-extrabold text-white"
                >
                  <SunIcon size={18} strokeWidth={2} />
                  Resumen del día
                </Link>

                <LinkedParentsPanel
                  parentRows={parentRows}
                  onLinkParent={openLinkModal}
                />
              </div>
            </div>
          ) : (
            <KidNotFoundCard />
          )}
        </div>
      </main>

      {isEditing && child && (
        <AddKidModal
          isOpen={isEditing}
          rooms={rooms}
          onClose={closeEditModal}
          onSave={handleSaveKid}
          isSaving={isSaving}
          saveError={saveError}
          initialValues={{
            fullName: child.full_name,
            birthDate: child.birth_date,
            roomId: child.room_id,
            allergyTags: child.allergy_tags,
            medicalNotes: child.medical_notes ?? "",
            enrolledAt: child.enrolled_at,
            photoConsent: child.photo_consent,
          }}
          submitLabel="Editar niño"
        />
      )}

      {isLinkModalOpen && child && kid && (
        <LinkParentModal
          isOpen={isLinkModalOpen}
          childId={child.id}
          kidName={kid.name}
          kidFirstName={kidFirstName}
          onClose={closeLinkModal}
        />
      )}
    </div>
  );
}

function KidHeader({ kid, onEdit }: { kid: Kid; onEdit: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-[18px]">
      <div
        aria-hidden="true"
        className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full font-heading text-[34px] font-semibold"
        style={{ backgroundColor: kid.avatarBg, color: kid.avatarInk }}
      >
        {kid.initial}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 font-heading text-[28px] font-semibold leading-tight text-ink">
          {kid.name}
        </h1>
        <p className="mt-1 m-0 text-[15px] text-ink-muted">
          {kid.age} años · Sala {kid.room}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex-none rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-[#6e6359]"
      >
        Editar
      </button>
    </div>
  );
}

function KidNotesPanel({ note }: { note: string }) {
  return (
    <div className="flex gap-[14px] rounded-[16px] bg-alert-bg px-[18px] py-4">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-alert-icon-bg">
        <AlertIcon />
      </div>
      <div>
        <h2 className="mb-0.5 text-[15px] font-extrabold text-alert-title">
          Alergias y notas
        </h2>
        <div className="text-[14.5px] leading-normal text-alert-text">
          {note}
        </div>
      </div>
    </div>
  );
}

const parentAvatarPalette = [
  { bg: "#C9B6E8", ink: "#FFFFFF" },
  { bg: "#A9C7E8", ink: "#FFFFFF" },
  { bg: "#F4B8CC", ink: "#FFFFFF" },
  { bg: "#B9DEC4", ink: "#FFFFFF" },
  { bg: "#F4DC8E", ink: "#FFFFFF" },
];

function LinkedParentsPanel({
  parentRows,
  onLinkParent,
}: {
  parentRows: ParentRowData[];
  onLinkParent: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-surface px-[18px] py-4">
      <h2 className="mb-[14px] text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
        PADRES VINCULADOS
      </h2>
      <div className="flex flex-col gap-[14px]">
        <ul className="flex flex-col gap-[14px]">
          {parentRows.map((parent, index) => (
            <li key={`${parent.name}-${index}`}>
              <ParentRow
                parent={parent}
                avatar={parentAvatarPalette[index % parentAvatarPalette.length]}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onLinkParent}
          className="flex items-center gap-3 px-0 pb-2 pt-2"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
            <PlusIcon />
          </span>
          <span className="text-[14.5px] font-extrabold text-coral-deep">
            Vincular otro padre
          </span>
        </button>
      </div>
    </div>
  );
}

function KidNotFoundCard() {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-6">
      <h1 className="m-0 font-heading text-[24px] font-semibold text-ink">
        Niño no encontrado
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        El niño que buscas no está registrado en esta sala.
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[18px] py-[15px] ${
        divider ? "border-b border-border-soft" : ""
      }`}
    >
      <dt className="m-0 text-[14.5px] text-ink-muted">{label}</dt>
      <dd className="m-0 text-[14.5px] font-extrabold text-ink">{value}</dd>
    </div>
  );
}

function ParentRow({
  parent,
  avatar,
}: {
  parent: ParentRowData;
  avatar: { bg: string; ink: string };
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-heading text-[16px] font-semibold"
        style={{ backgroundColor: avatar.bg, color: avatar.ink }}
      >
        {getInitial(parent.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-extrabold text-ink">
          {parent.name}
        </div>
        <div className="text-[12.5px] text-ink-soft">{parent.role}</div>
      </div>
      <StatusPill status={parent.status} />
    </div>
  );
}

function StatusPill({ status }: { status: ParentRowData["status"] }) {
  const isPending = status === "PENDIENTE";

  return (
    <span
      className={`flex-none rounded-full px-[9px] py-1 text-[10.5px] font-extrabold ${
        isPending ? "bg-pending-bg text-pending-ink" : "bg-[#CFEBD8] text-[#3E9B6C]"
      }`}
    >
      {status}
    </span>
  );
}

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
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

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
