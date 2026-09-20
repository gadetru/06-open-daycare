"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode, SVGProps } from "react";
import type { Kid } from "../../data/kids";
import { rooms, type RoomName } from "../../data/rooms";
import { getMaxBirthDate, isRealDate } from "../../lib/dates";
import { buildNewKid, type NewKidFields } from "../../lib/kids-utils";

type AddKidModalProps = {
  isOpen: boolean;
  nextIndex: number;
  onClose: () => void;
  onSave: (kid: Kid) => void;
};

type FormState = {
  name: string;
  birthDate: string;
  room: RoomName;
  allergies: string;
  note: string;
};

type FieldErrors = {
  name?: string;
  birthDate?: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  birthDate: "",
  room: "Soles",
  allergies: "",
  note: "",
};

export default function AddKidModal({
  isOpen,
  nextIndex,
  onClose,
  onSave,
}: AddKidModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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

  function updateTextField(field: "name" | "allergies" | "note", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBirthDate(value: string) {
    setForm((current) => ({ ...current, birthDate: applyDateMask(value) }));
    setErrors((current) => ({ ...current, birthDate: undefined }));
  }

  function updateName(value: string) {
    setForm((current) => ({ ...current, name: value }));
    setErrors((current) => ({ ...current, name: undefined }));
  }

  function selectRoom(room: RoomName) {
    setForm((current) => ({ ...current, room }));
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
    };
    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.birthDate) {
      return;
    }

    const parts = parseBirthDate(form.birthDate) as {
      day: number;
      month: number;
      year: number;
    };
    const fields: NewKidFields = {
      name: form.name,
      birthDate: new Date(parts.year, parts.month - 1, parts.day),
      room: form.room,
      allergies: form.allergies,
      note: form.note,
    };

    onSave(buildNewKid(fields, nextIndex));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(63,54,46,.4)] p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-kid-title"
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-border bg-auth-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
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
            Agregar niño
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="text-[15px] font-extrabold text-primary"
          >
            Guardar
          </button>
        </div>

        <div className="px-[26px] py-6">
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
                  <span className="flex-1 text-left">{form.room}</span>
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
                          key={room}
                          type="button"
                          onClick={() => selectRoom(room)}
                          className={`block w-full px-4 py-[11px] text-left text-[15px] hover:bg-surface-soft ${
                            room === form.room
                              ? "font-extrabold text-ink"
                              : "font-semibold text-ink-soft"
                          }`}
                        >
                          {room}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
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

          <div>
            <FieldLabel>NOTAS MÉDICAS</FieldLabel>
            <textarea
              value={form.note}
              onChange={(event) => updateTextField("note", event.target.value)}
              placeholder="Indicaciones, medicación, contactos…"
              rows={4}
              className="w-full resize-y rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-[13px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-placeholder min-h-[90px]"
            />
          </div>
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

function parseBirthDate(value: string): {
  day: number;
  month: number;
  year: number;
} | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function validateBirthDate(value: string): string | undefined {
  if (value.trim() === "") {
    return "Ingresá la fecha de nacimiento";
  }
  const parts = parseBirthDate(value);
  if (!parts) {
    return "Formato inválido (dd/mm/aaaa)";
  }
  if (!isRealDate(parts.day, parts.month, parts.year)) {
    return "La fecha no existe";
  }
  if (parts.year < 2000) {
    return "El año debe ser mayor a 1999";
  }
  const birthDate = new Date(parts.year, parts.month - 1, parts.day);
  if (birthDate > getMaxBirthDate()) {
    return "Debe tener al menos 2 años";
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