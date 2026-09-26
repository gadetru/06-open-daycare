"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { CreatePostInput } from "@/app/actions/posts";
import type { PostAudience, PostTypeValue } from "@/app/lib/posts-utils";

export type PostChildOption = {
  id: string;
  firstName: string;
  initial: string;
  avatarBg: string;
  avatarInk: string;
};

type CreatePostModalProps = {
  isOpen: boolean;
  roomName: string | null;
  kids: PostChildOption[];
  onClose: () => void;
  onPublish: (fields: CreatePostInput) => void;
  isPublishing: boolean;
  publishError: string | null;
};

type FieldErrors = {
  recipient?: string;
  type?: string;
  description?: string;
};

type TypeOption = {
  value: PostTypeValue;
  label: string;
  chipClass: string;
  selectedClass: string;
};

// El value es el valor del enum de la base; el label y los colores son de la UI.
const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "meal",
    label: "Comida",
    chipClass: "bg-pending-bg text-pending-ink",
    selectedClass: "bg-pending-ink text-white",
  },
  {
    value: "nap",
    label: "Siesta",
    chipClass: "bg-type-siesta-bg text-type-siesta-ink",
    selectedClass: "bg-type-siesta-ink text-white",
  },
  {
    value: "activity",
    label: "Actividad",
    chipClass: "bg-info-bg text-info",
    selectedClass: "bg-info text-white",
  },
  {
    value: "achievement",
    label: "Logro",
    chipClass: "bg-success-bg text-success",
    selectedClass: "bg-success text-white",
  },
  {
    value: "mood",
    label: "Ánimo",
    chipClass: "bg-type-mood-bg text-type-mood-ink",
    selectedClass: "bg-type-mood-ink text-white",
  },
  {
    value: "photo",
    label: "Foto",
    chipClass: "bg-type-photo-bg text-type-photo-ink",
    selectedClass: "bg-type-photo-ink text-white",
  },
  {
    value: "announcement",
    label: "Anuncio",
    chipClass: "bg-announce-bg text-announce",
    selectedClass: "bg-announce text-white",
  },
];

export default function CreatePostModal({
  isOpen,
  roomName,
  kids,
  onClose,
  onPublish,
  isPublishing,
  publishError,
}: CreatePostModalProps) {
  const [audience, setAudience] = useState<PostAudience | null>(null);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [type, setType] = useState<PostTypeValue | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hasRoom = roomName !== null;
  const canPickChildren = hasRoom && kids.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => previouslyFocusedElement?.focus();
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

  function isChildSelected(childId: string): boolean {
    return childIds.includes(childId);
  }

  // Las tres pills son excluyentes: elegir una siempre borra lo anterior.
  function selectRoomWide() {
    setAudience("room");
    setChildIds([]);
    setErrors((current) => ({ ...current, recipient: undefined }));
  }

  function selectDaycareWide() {
    setAudience("daycare");
    setChildIds([]);
    setErrors((current) => ({ ...current, recipient: undefined }));
  }

  function toggleChild(childId: string) {
    const nextChildIds = childIds.includes(childId)
      ? childIds.filter((id) => id !== childId)
      : [...childIds, childId];

    setChildIds(nextChildIds);
    // Si se deselecciona el último niño, el destino vuelve a quedar vacío.
    setAudience(nextChildIds.length > 0 ? "children" : null);
    setErrors((current) => ({ ...current, recipient: undefined }));
  }

  function selectType(selectedType: PostTypeValue) {
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
      recipient: hasRecipient(audience, childIds)
        ? undefined
        : "Elegí al menos un destinatario",
      type: type ? undefined : "Elegí un tipo",
      description: description.trim() ? undefined : "Escribí una descripción",
    };
    setErrors(nextErrors);

    if (nextErrors.recipient || nextErrors.type || nextErrors.description) {
      return;
    }

    onPublish({
      type: type as PostTypeValue,
      body: description.trim(),
      audience: audience as PostAudience,
      childIds,
    });
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
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-[15px] font-bold text-ink-muted"
          >
            Cancelar
          </button>
          <h2
            id="create-post-title"
            className="font-heading text-[18px] font-semibold text-ink"
          >
            Nueva publicación
          </h2>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="text-[15px] font-extrabold text-primary disabled:opacity-50"
          >
            {isPublishing ? "Publicando…" : "Publicar"}
          </button>
        </div>

        <div className="px-[26px] py-6">
          {publishError && (
            <p
              role="alert"
              className="mb-[18px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[13.5px] font-semibold text-error-text"
            >
              {publishError}
            </p>
          )}

          <div className="mb-[18px]">
            <SectionLabel id="create-post-recipient-label">PARA</SectionLabel>
            <div
              role="group"
              aria-labelledby="create-post-recipient-label"
              aria-describedby={
                errors.recipient ? "create-post-recipient-error" : undefined
              }
              className="mb-[6px] flex flex-wrap gap-[9px]"
            >
              {hasRoom && (
                <button
                  type="button"
                  onClick={selectRoomWide}
                  disabled={isPublishing}
                  aria-pressed={audience === "room"}
                  className={pillClass(audience === "room")}
                >
                  Toda la sala
                </button>
              )}
              <button
                type="button"
                onClick={selectDaycareWide}
                disabled={isPublishing}
                aria-pressed={audience === "daycare"}
                className={pillClass(audience === "daycare")}
              >
                Anuncio general
              </button>
              {canPickChildren &&
                kids.map((kid) => (
                  <button
                    key={kid.id}
                    type="button"
                    onClick={() => toggleChild(kid.id)}
                    disabled={isPublishing}
                    aria-pressed={isChildSelected(kid.id)}
                    className={pillClass(isChildSelected(kid.id))}
                  >
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-heading text-[13px] font-semibold"
                      style={{ backgroundColor: kid.avatarBg, color: kid.avatarInk }}
                    >
                      {kid.initial}
                    </span>
                    {kid.firstName}
                  </button>
                ))}
            </div>
            {!hasRoom && (
              <p className="mb-[10px] text-[13px] leading-[1.45] text-ink-soft">
                No tenés una sala asignada, así que solo podés publicar anuncios
                generales.
              </p>
            )}
            {errors.recipient ? (
              <InlineError
                id="create-post-recipient-error"
                message={errors.recipient}
              />
            ) : (
              <div className="mb-[22px]" />
            )}
          </div>

          <div className="mb-[18px]">
            <SectionLabel id="create-post-type-label">TIPO</SectionLabel>
            <div
              role="group"
              aria-labelledby="create-post-type-label"
              aria-describedby={errors.type ? "create-post-type-error" : undefined}
              className="mb-[6px] flex flex-wrap gap-[9px]"
            >
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectType(option.value)}
                  disabled={isPublishing}
                  aria-pressed={type === option.value}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold disabled:opacity-60 ${
                    type === option.value ? option.selectedClass : option.chipClass
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.type ? (
              <InlineError id="create-post-type-error" message={errors.type} />
            ) : (
              <div className="mb-[22px]" />
            )}
          </div>

          <div>
            <label
              htmlFor="create-post-description"
              className="mb-[10px] block text-[12px] font-extrabold tracking-[0.7px] text-ink-muted"
            >
              DESCRIPCIÓN
            </label>
            <textarea
              id="create-post-description"
              value={description}
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="Contá cómo le fue hoy…"
              rows={4}
              disabled={isPublishing}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "create-post-description-error" : undefined
              }
              className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-placeholder disabled:opacity-60 ${
                errors.description ? "border-error-border" : "border-field-border"
              }`}
            />
            {errors.description && (
              <InlineError
                id="create-post-description-error"
                message={errors.description}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function hasRecipient(audience: PostAudience | null, childIds: string[]): boolean {
  if (audience === "room" || audience === "daycare") {
    return true;
  }
  return audience === "children" && childIds.length > 0;
}

function pillClass(isSelected: boolean): string {
  const base =
    "flex items-center gap-2 rounded-full border-[1.5px] px-[14px] py-[6px] text-[14px] font-bold disabled:opacity-60";
  if (isSelected) {
    return `${base} border-ink bg-ink text-white`;
  }
  return `${base} border-border bg-surface text-[#6E6359]`;
}

function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="mb-[10px] text-[12px] font-extrabold tracking-[0.7px] text-ink-muted"
    >
      {children}
    </div>
  );
}

function InlineError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-[6px] text-[13px] font-semibold text-error-text"
    >
      {message}
    </p>
  );
}
