"use client";

import { use, useState } from "react";
import type { SVGProps } from "react";
import Link from "next/link";
import Sidebar from "../../components/shared/Sidebar";
import SunIcon from "../../components/shared/SunIcon";
import LinkParentModal from "../../components/kids/LinkParentModal";
import type { NewParentFields } from "../../components/kids/LinkParentModal";
import { kids } from "../../data/kids";
import type { Kid, LinkedParent } from "../../data/kids";

const parentAvatarPalette = [
  { bg: "#C9B6E8", ink: "#FFFFFF" },
  { bg: "#A9C7E8", ink: "#FFFFFF" },
  { bg: "#F4B8CC", ink: "#FFFFFF" },
  { bg: "#B9DEC4", ink: "#FFFFFF" },
  { bg: "#F4DC8E", ink: "#FFFFFF" },
];

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default function KidProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);
  const kid = kids.find((item) => item.id === id);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        {kid ? (
          <KidProfileContent key={kid.id} kid={kid} />
        ) : (
          <div className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-[34px] sm:px-10">
            <Link
              href="/kids"
              className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-ink-muted"
            >
              <ChevronLeftIcon />
              Volver a Niños
            </Link>
            <div className="rounded-[16px] border border-border bg-surface p-6">
              <h1 className="m-0 font-heading text-[24px] font-semibold text-ink">
                Niño no encontrado
              </h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                El niño que buscas no está registrado en esta sala.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KidProfileContent({ kid }: { kid: Kid }) {
  const [parents, setParents] = useState<LinkedParent[]>(kid.parents);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalSession, setLinkModalSession] = useState(0);

  const kidFirstName = kid.name.split(" ")[0];

  function openLinkModal() {
    setLinkModalSession((current) => current + 1);
    setIsLinkModalOpen(true);
  }

  function handleSaveParent(fields: NewParentFields) {
    const newParent: LinkedParent = {
      name: fields.name,
      email: fields.email,
      role: `${fields.parentesco} · invitación enviada`,
      status: "PENDIENTE",
    };
    setParents((current) => [...current, newParent]);
    setIsLinkModalOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-[34px] sm:px-10">
      <Link
        href="/kids"
        className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-ink-muted"
      >
        <ChevronLeftIcon />
        Volver a Niños
      </Link>

      <div className="flex flex-wrap items-start gap-[26px]">
        <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
          <div className="flex flex-wrap items-center gap-[18px]">
            <div
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
            <Link
              href="/agregar-nino"
              className="flex-none rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-[#6e6359]"
            >
              Editar
            </Link>
          </div>

          <div className="flex gap-[14px] rounded-[16px] bg-alert-bg px-[18px] py-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-alert-icon-bg">
              <AlertIcon />
            </div>
            <div>
              <div className="mb-0.5 text-[15px] font-extrabold text-alert-title">
                Alergias y notas
              </div>
              <div className="text-[14.5px] leading-normal text-alert-text">
                {kid.note}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
            <InfoRow label="Fecha de nacimiento" value={kid.birthDate} divider />
            <InfoRow label="Sala" value={kid.room} divider />
            <InfoRow label="Ingreso" value={kid.enrolledDate} />
          </div>
        </div>

        <div className="flex w-full flex-none flex-col gap-[14px] lg:w-[300px]">
          <Link
            href="/resumen-dia"
            className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink px-4 py-[13px] text-[15px] font-extrabold text-white"
          >
            <SunIcon size={18} strokeWidth={2} />
            Resumen del día
          </Link>

          <div className="rounded-[16px] border border-border bg-surface px-[18px] py-4">
            <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
              PADRES VINCULADOS
            </div>
            <div className="flex flex-col gap-[14px]">
              {parents.map((parent, index) => (
                <ParentRow
                  key={parent.name}
                  parent={parent}
                  avatar={parentAvatarPalette[index % parentAvatarPalette.length]}
                />
              ))}
              <button
                type="button"
                onClick={openLinkModal}
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
        </div>
      </div>

      <LinkParentModal
        key={`link-parent-${linkModalSession}`}
        isOpen={isLinkModalOpen}
        kidName={kid.name}
        kidFirstName={kidFirstName}
        onClose={() => setIsLinkModalOpen(false)}
        onSaveParent={handleSaveParent}
      />
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
      <span className="text-[14.5px] text-ink-muted">{label}</span>
      <span className="text-[14.5px] font-extrabold text-ink">{value}</span>
    </div>
  );
}

function ParentRow({
  parent,
  avatar,
}: {
  parent: LinkedParent;
  avatar: { bg: string; ink: string };
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-heading text-[16px] font-semibold"
        style={{ backgroundColor: avatar.bg, color: avatar.ink }}
      >
        {parent.name.charAt(0)}
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

function StatusPill({ status }: { status: "ACTIVA" | "PENDIENTE" }) {
  if (status === "PENDIENTE") {
    return (
      <span className="flex-none rounded-full bg-pending-bg px-[9px] py-1 text-[10.5px] font-extrabold text-pending-ink">
        PENDIENTE
      </span>
    );
  }

  return (
    <span className="flex-none rounded-full bg-[#CFEBD8] px-[9px] py-1 text-[10.5px] font-extrabold text-[#3E9B6C]">
      ACTIVA
    </span>
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

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
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
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
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