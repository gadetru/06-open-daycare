"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode, SVGProps } from "react";
import {
  getMaxBirthDate,
  getTodayMasked,
  isRealDate,
} from "../../lib/dates";
import {
  allergyTagsToText,
  isoDateToMasked,
  parseAllergyTags,
  type NewChildFields,
} from "../../lib/kids-utils";

export type RoomOption = {
  id: string;
  name: string;
};

type AddKidModalProps = {
  isOpen: boolean;
  rooms: RoomOption[];
  onClose: () => void;
  onSave: (fields: NewChildFields) => void;
  isSaving: boolean;
  saveError: string | null;
  initialValues?: NewChildFields | undefined;
  submitLabel?: string | undefined;
};

type FormState = {
  name: string;
  birthDate: string;
  roomId: string;
  allergies: string;
  note: string;
  enrolledAt: string;
  photoConsent: boolean;
};

type FieldErrors = {
  name?: string;
  birthDate?: string;
  roomId?: string;
  enrolledAt?: string;
};

type DateParts = {
  day: number;
  month: number;
  year: number;
};

function getEmptyForm(rooms: RoomOption[], initialValues?: NewChildFields): FormState {
  const defaultForm: FormState = {
    name: "",
    birthDate: "",
    roomId: rooms[0]?.id ?? "",
    allergies: "",
    note: "",
    enrolledAt: getTodayMasked(),
    photoConsent: true,
  };

  if (initialValues) {
    return {
      name: initialValues.fullName ?? defaultForm.name,
      birthDate: isoDateToMasked(initialValues.birthDate) || defaultForm.birthDate,
      roomId: initialValues.roomId ?? defaultForm.roomId,
      allergies: allergyTagsToText(initialValues.allergyTags) || defaultForm.allergies,
      note: initialValues.medicalNotes ?? defaultForm.note,
      enrolledAt: isoDateToMasked(initialValues.enrolledAt) || defaultForm.enrolledAt,
      photoConsent: initialValues.photoConsent ?? defaultForm.photoConsent,
    };
  }

  return defaultForm;
}

export default function AddKidModal({
  isOpen,
  rooms,
  onClose,
  onSave,
  isSaving,
  saveError,
  initialValues,
  submitLabel,
}: AddKidModalProps) {
  const [form, setForm] = useState<FormState>(() => getEmptyForm(rooms, initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const selectedRoom = rooms.find((room) => room.id === form.roomId);

  function updateTextField(field: "name" | "allergies" | "note", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBirthDate(value: string) {
    setForm((current) => ({ ...current, birthDate: applyDateMask(value) }));
    setErrors((current) => ({ ...current, birthDate: undefined }));
  }

  function updateEnrolledAt(value: string) {
    setForm((current) => ({ ...current, enrolledAt: applyDateMask(value) }));
    setErrors((current) => ({ ...current, enrolledAt: undefined }));
  }

  function updateName(value: string) {
    setForm((current) => ({ ...current, name: value }));
    setErrors((current) => ({ ...current, name: undefined }));
  }

  function updatePhotoConsent(value: boolean) {
    setForm((current) => ({ ...current, photoConsent: value }));
  }

  function selectRoom(roomId: string) {
    setForm((current) => ({ ...current, roomId }));
    setErrors((current) => ({ ...current, roomId: undefined }));
    setIsRoomsOpen(false);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleSave() {
    const nextErrors: FieldErrors = {
      name: form.name.trim() ? undefined : "El nombre es obligatorio",
      birthDate: validateBirthDate(form.birthDate),
      roomId: form.roomId ? undefined : "Elegí una sala",
      enrolledAt: validateEnrolledAt(form.enrolledAt, form.birthDate),
    };
    setErrors(nextErrors);

    if (
      nextErrors.name ||
      nextErrors.birthDate ||
      nextErrors.roomId ||
      nextErrors.enrolledAt
    ) {
      return;
    }

    const birthParts = parseMaskedDate(form.birthDate) as DateParts;
    const enrolledParts = parseMaskedDate(form.enrolledAt) as DateParts;

    onSave({
      fullName: form.name.trim(),
      birthDate: toIsoDate(birthParts),
      roomId: form.roomId,
      allergyTags: parseAllergyTags(form.allergies),
      medicalNotes: form.note.trim(),
      enrolledAt: toIsoDate(enrolledParts),
      photoConsent: form.photoConsent,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(63,54,46,.4)] p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-kid-title"
    >
      <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-border bg-auth-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
        <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-bold text-ink-muted"
          >
            Cancelar
          </button>
<span
            id="add-kid-title"
            className="font-heading text-[18px] font-semibold text-ink"
          >
            {submitLabel ?? "Agregar niño"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-[15px] font-extrabold text-primary disabled:opacity-50"
          >
            {isSaving ? "Guardando…" : submitLabel ?? "Guardar"}
          </button>
        </div>

        <div className="px-[26px] py-6">
          {saveError && (
            <p
              role="alert"
              className="mb-[18px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[13.5px] font-semibold text-error-text"
            >
              {saveError}
            </p>
          )}
          <div className="mb-[18px]">
            <FieldLabel>NOMBRE COMPLETO</FieldLabel>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Ej. Martina López"
              className={inputClass(Boolean(errors.name))}
            />
            {errors.name && <InlineError message={errors.name} />}
          </div>

          <div className="mb-[18px] flex gap-[14px]">
            <div className="flex-1">
              <FieldLabel>FECHA DE NACIMIENTO</FieldLabel>
              <input
                type="text"
                inputMode="numeric"
                value={form.birthDate}
                onChange={(event) => updateBirthDate(event.target.value)}
                placeholder="dd/mm/aaaa"
                className={inputClass(Boolean(errors.birthDate))}
              />
              {errors.birthDate && <InlineError message={errors.birthDate} />}
            </div>

            <div className="flex-1">
              <FieldLabel>SALA</FieldLabel>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRoomsOpen((current) => !current)}
                  className="flex w-full items-center gap-2 rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-[13px] text-[15px] font-bold text-ink"
                >
                  <span className="flex-1 text-left">
                    {selectedRoom ? selectedRoom.name : "Sin salas"}
                  </span>
                  <ChevronDownIcon isOpen={isRoomsOpen} />
                </button>

                {isRoomsOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden="true"
                      tabIndex={-1}
                      onClick={() => setIsRoomsOpen(false)}
                      className="fixed inset-0 z-[1] cursor-default"
                    />
                    <div className="absolute left-0 right-0 top-full z-[2] mt-[6px] overflow-hidden rounded-[14px] border border-field-border bg-white shadow-[0_14px_30px_-14px_rgba(63,54,46,.4)]">
                      {rooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => selectRoom(room.id)}
                          className={`block w-full px-4 py-[11px] text-left text-[15px] hover:bg-surface-soft ${
                            room.id === form.roomId
                              ? "font-extrabold text-ink"
                              : "font-semibold text-ink-soft"
                          }`}
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {errors.roomId && <InlineError message={errors.roomId} />}
            </div>
          </div>

          <div className="mb-[18px]">
            <FieldLabel>FECHA DE INGRESO</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              value={form.enrolledAt}
              onChange={(event) => updateEnrolledAt(event.target.value)}
              placeholder="dd/mm/aaaa"
              className={inputClass(Boolean(errors.enrolledAt))}
            />
            {errors.enrolledAt && <InlineError message={errors.enrolledAt} />}
          </div>

          <div className="mb-[18px]">
            <FieldLabel>ALERGIAS (ETIQUETAS)</FieldLabel>
            <input
              type="text"
              value={form.allergies}
              onChange={(event) => updateTextField("allergies", event.target.value)}
              placeholder="Ej. Maní, Lactosa"
              className={inputClass(false)}
            />
          </div>

          <div className="mb-[18px]">
            <FieldLabel>NOTAS MÉDICAS</FieldLabel>
            <textarea
              value={form.note}
              onChange={(event) => updateTextField("note", event.target.value)}
              placeholder="Indicaciones, medicación, contactos…"
              rows={4}
              className="w-full resize-y rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-[13px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-placeholder min-h-[90px]"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.photoConsent}
              onChange={(event) => updatePhotoConsent(event.target.checked)}
              className="h-5 w-5 flex-none accent-[#EE8164]"
            />
            <span className="text-[14.5px] font-semibold text-ink">
              Tiene consentimiento para fotos
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-ink-muted">
      {children}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-[6px] text-[13px] font-semibold text-error-text">
      {message}
    </p>
  );
}

function inputClass(hasError: boolean): string {
  const base =
    "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-placeholder";
  return `${base} ${hasError ? "border-error-border" : "border-field-border"}`;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseMaskedDate(value: string): DateParts | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function toIsoDate(parts: DateParts): string {
  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function toMidnight(parts: DateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

function toMidnightToday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function validateBirthDate(value: string): string | undefined {
  if (value.trim() === "") {
    return "Ingresá la fecha de nacimiento";
  }
  const parts = parseMaskedDate(value);
  if (!parts) {
    return "Formato inválido (dd/mm/aaaa)";
  }
  if (!isRealDate(parts.day, parts.month, parts.year)) {
    return "La fecha no existe";
  }
  if (parts.year < 2000) {
    return "El año debe ser mayor a 1999";
  }
  const birthDate = toMidnight(parts);
  if (birthDate > getMaxBirthDate()) {
    return "Debe tener al menos 2 años";
  }
  return undefined;
}

function validateEnrolledAt(value: string, birthValue: string): string | undefined {
  if (value.trim() === "") {
    return "Ingresá la fecha de ingreso";
  }
  const parts = parseMaskedDate(value);
  if (!parts) {
    return "Formato inválido (dd/mm/aaaa)";
  }
  if (!isRealDate(parts.day, parts.month, parts.year)) {
    return "La fecha no existe";
  }
  const enrolledAt = toMidnight(parts);
  if (enrolledAt > toMidnightToday()) {
    return "La fecha de ingreso no puede ser futura";
  }
  const birthParts = parseMaskedDate(birthValue);
  if (
    birthParts &&
    isRealDate(birthParts.day, birthParts.month, birthParts.year) &&
    enrolledAt < toMidnight(birthParts)
  ) {
    return "La fecha de ingreso no puede ser anterior al nacimiento";
  }
  return undefined;
}

function ChevronDownIcon({
  isOpen,
  ...props
}: SVGProps<SVGSVGElement> & { isOpen: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
