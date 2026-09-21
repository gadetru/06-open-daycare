"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode, SVGProps } from "react";
import { kids } from "../../data/kids";
import type { PostCardProps, PostType } from "../shared/PostCard";
import { buildRecipient } from "../../lib/posts-utils";

type CreatePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (post: PostCardProps) => void;
};

type Recipients = {
  roomWide: boolean;
  kidIds: string[];
};

type FieldErrors = {
  recipient?: string;
  type?: string;
  description?: string;
};

type TypeOption = {
  type: PostType;
  label: string;
  chipClass: string;
};

const TYPE_OPTIONS: TypeOption[] = [
  { type: "COMIDA", label: "Comida", chipClass: "bg-pending-bg text-pending-ink" },
  { type: "SIESTA", label: "Siesta", chipClass: "bg-type-siesta-bg text-type-siesta-ink" },
  { type: "ACTIVIDAD", label: "Actividad", chipClass: "bg-info-bg text-info" },
  { type: "LOGRO", label: "Logro", chipClass: "bg-success-bg text-success" },
  { type: "ÁNIMO", label: "Ánimo", chipClass: "bg-type-mood-bg text-type-mood-ink" },
  { type: "FOTO", label: "Foto", chipClass: "bg-type-photo-bg text-type-photo-ink" },
  { type: "ANUNCIO", label: "Anuncio", chipClass: "bg-announce-bg text-announce" },
];

const SELECTED_TYPE_CLASS: Record<PostType, string> = {
  COMIDA: "bg-pending-ink text-white",
  SIESTA: "bg-type-siesta-ink text-white",
  ACTIVIDAD: "bg-info text-white",
  LOGRO: "bg-success text-white",
  ÁNIMO: "bg-type-mood-ink text-white",
  FOTO: "bg-type-photo-ink text-white",
  ANUNCIO: "bg-announce text-white",
};

const EMPTY_RECIPIENTS: Recipients = { roomWide: false, kidIds: [] };

export default function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
}: CreatePostModalProps) {
  const [recipients, setRecipients] = useState<Recipients>(EMPTY_RECIPIENTS);
  const [type, setType] = useState<PostType | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function isKidSelected(kidId: string): boolean {
    return recipients.kidIds.includes(kidId);
  }

  function toggleKid(kidId: string) {
    setRecipients((current) => {
      const kidIds = isKidSelected(kidId)
        ? current.kidIds.filter((id) => id !== kidId)
        : [...current.kidIds, kidId];
      return { roomWide: false, kidIds };
    });
    setErrors((current) => ({ ...current, recipient: undefined }));
  }

  function selectRoomWide() {
    setRecipients({ roomWide: true, kidIds: [] });
    setErrors((current) => ({ ...current, recipient: undefined }));
  }

  function selectType(selectedType: PostType) {
    setType(selectedType);
    setErrors((current) => ({ ...current, type: undefined }));
  }

  function updateDescription(value: string) {
    setDescription(value);
    setErrors((current) => ({ ...current, description: undefined }));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handlePublish() {
    const nextErrors: FieldErrors = {
      recipient: hasRecipient(recipients) ? undefined : "Elegí al menos un destinatario",
      type: type ? undefined : "Elegí un tipo",
      description: description.trim() ? undefined : "Escribí una descripción",
    };
    setErrors(nextErrors);

    if (nextErrors.recipient || nextErrors.type || nextErrors.description) {
      return;
    }

    onPublish(buildPublishedPost(recipients, type as PostType, description.trim()));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(63,54,46,.4)] p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div className="max-h-[92vh] w-full max-w-[580px] overflow-y-auto rounded-[24px] border border-border bg-auth-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
        <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-bold text-ink-muted"
          >
            Cancelar
          </button>
          <span
            id="create-post-title"
            className="font-heading text-[18px] font-semibold text-ink"
          >
            Nueva publicación
          </span>
          <button
            type="button"
            onClick={handlePublish}
            className="text-[15px] font-extrabold text-primary"
          >
            Publicar
          </button>
        </div>

        <div className="px-[26px] py-6">
          <div className="mb-[18px]">
            <SectionLabel>PARA</SectionLabel>
            <div className="mb-[6px] flex flex-wrap gap-[9px]">
              <button
                type="button"
                onClick={selectRoomWide}
                aria-pressed={recipients.roomWide}
                className={pillClass(recipients.roomWide)}
              >
                Toda la sala
              </button>
              {kids.map((kid) => (
                <button
                  key={kid.id}
                  type="button"
                  onClick={() => toggleKid(kid.id)}
                  aria-pressed={isKidSelected(kid.id)}
                  className={pillClass(isKidSelected(kid.id))}
                >
                  <span
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-heading text-[13px] font-semibold"
                    style={{ backgroundColor: kid.avatarBg, color: kid.avatarInk }}
                  >
                    {kid.initial}
                  </span>
                  {getFirstName(kid.name)}
                </button>
              ))}
            </div>
            {errors.recipient ? (
              <InlineError message={errors.recipient} />
            ) : (
              <div className="mb-[22px]" />
            )}
          </div>

          <div className="mb-[18px]">
            <SectionLabel>TIPO</SectionLabel>
            <div className="mb-[6px] flex flex-wrap gap-[9px]">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => selectType(option.type)}
                  aria-pressed={type === option.type}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold ${
                    type === option.type
                      ? SELECTED_TYPE_CLASS[option.type]
                      : option.chipClass
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.type ? (
              <InlineError message={errors.type} />
            ) : (
              <div className="mb-[22px]" />
            )}
          </div>

          <div className="mb-[22px]">
            <SectionLabel>DESCRIPCIÓN</SectionLabel>
            <textarea
              value={description}
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="Contá cómo le fue hoy…"
              rows={4}
              className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-placeholder ${
                errors.description ? "border-error-border" : "border-field-border"
              }`}
            />
            {errors.description && <InlineError message={errors.description} />}
          </div>

          <div>
            <SectionLabel>FOTOS</SectionLabel>
            <div className="flex gap-3">
              <div className="flex h-24 w-24 flex-none items-center justify-center rounded-[14px] border border-border bg-surface-soft text-chevron">
                <ImageIcon />
              </div>
              <div className="flex h-24 w-24 flex-none flex-col items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-surface-soft text-[12px] text-[#B0A290]">
                <PlusIcon />
                Agregar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hasRecipient(recipients: Recipients): boolean {
  return recipients.roomWide || recipients.kidIds.length > 0;
}

function buildPublishedPost(
  recipients: Recipients,
  type: PostType,
  text: string
): PostCardProps {
  const selectedKids = kids.filter((kid) => recipients.kidIds.includes(kid.id));
  const firstNames = selectedKids.map((kid) => getFirstName(kid.name));
  const childName = recipients.roomWide ? "Anuncio general" : firstNames[0];

  return {
    type,
    childName,
    time: getCurrentTime(),
    author: "vos",
    text,
    recipient: buildRecipient(firstNames),
    likes: 0,
    comments: 0,
  };
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function pillClass(isSelected: boolean): string {
  const base =
    "flex items-center gap-2 rounded-full border-[1.5px] px-[14px] py-[6px] text-[14px] font-bold";
  if (isSelected) {
    return `${base} border-ink bg-ink text-white`;
  }
  return `${base} border-border bg-surface text-[#6E6359]`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[10px] text-[12px] font-extrabold tracking-[0.7px] text-ink-muted">
      {children}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-[6px] text-[13px] font-semibold text-error-text">{message}</p>
  );
}

function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C5503A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}