"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, SVGProps } from "react";
import {
  createParentInvitation,
  type ParentRelationshipValue,
} from "@/app/actions/invitations";

export type ParentRelationship = "Mamá" | "Papá" | "Tutor/a";

type LinkParentModalProps = {
  isOpen: boolean;
  childId: string;
  kidName: string;
  kidFirstName: string;
  onClose: () => void;
};

type FieldErrors = {
  name?: string;
  email?: string;
};

type SentResult = {
  code: string;
  expiresAt: string;
};

const RELATIONSHIPS: ParentRelationship[] = ["Mamá", "Papá", "Tutor/a"];

const RELATIONSHIP_TO_VALUE: Record<
  ParentRelationship,
  ParentRelationshipValue
> = {
  "Mamá": "mother",
  "Papá": "father",
  "Tutor/a": "guardian",
};

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LinkParentModal({
  isOpen,
  childId,
  kidName,
  kidFirstName,
  onClose,
}: LinkParentModalProps) {
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [relationship, setRelationship] = useState<ParentRelationship>("Mamá");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentResult, setSentResult] = useState<SentResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const isSent = sentResult !== null;

  function updateName(value: string) {
    setParentName(value);
    setErrors((current) => ({ ...current, name: undefined }));
  }

  function updateEmail(value: string) {
    setParentEmail(value);
    setErrors((current) => ({ ...current, email: undefined }));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  async function handleSubmit() {
    const nameError = parentName.trim()
      ? undefined
      : "El nombre es obligatorio";
    const emailError = validateEmail(parentEmail);
    const nextErrors: FieldErrors = { name: nameError, email: emailError };
    setErrors(nextErrors);

    if (nameError || emailError) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createParentInvitation({
        childId,
        fullName: parentName.trim(),
        email: parentEmail.trim(),
        relationship: RELATIONSHIP_TO_VALUE[relationship],
      });

      if (result.ok) {
        setSentResult({ code: result.code, expiresAt: result.expiresAt });
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError("No se pudo enviar la invitación");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(63,54,46,.4)] p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-parent-title"
    >
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <div
              id="link-parent-title"
              className="font-heading text-[18px] font-semibold text-ink"
            >
              Vincular padre
            </div>
            <div className="text-[13px] text-ink-soft">a {kidName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#F0E6D8] text-[#94887B]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-[26px] py-[22px]">
          {!isSent && (
            <>
              <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px]">
                <InfoIcon />
                <span className="text-[13.5px] leading-[1.45] text-[#3F5694]">
                  Le enviaremos un correo con un código para que active su
                  cuenta. Solo verá el feed de {kidFirstName}.
                </span>
              </div>

              <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-ink-muted">
                NOMBRE DEL PADRE/MADRE
              </div>
              <input
                type="text"
                value={parentName}
                onChange={(event) => updateName(event.target.value)}
                placeholder="Ej. Diego Fernández"
                disabled={isSubmitting}
                className={inputClass(Boolean(errors.name), isSubmitting)}
              />
              {errors.name ? (
                <InlineError message={errors.name} />
              ) : (
                <div className="mb-[18px]" />
              )}

              <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-ink-muted">
                EMAIL
              </div>
              <input
                type="email"
                value={parentEmail}
                onChange={(event) => updateEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={isSubmitting}
                className={inputClass(Boolean(errors.email), isSubmitting)}
              />
              {errors.email ? (
                <InlineError message={errors.email} />
              ) : (
                <div className="mb-[18px]" />
              )}

              <div className="mb-[10px] text-[12px] font-extrabold tracking-[0.7px] text-ink-muted">
                PARENTESCO
              </div>
              <div className="mb-5 flex gap-[9px]">
                {RELATIONSHIPS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRelationship(option)}
                    disabled={isSubmitting}
                    aria-pressed={relationship === option}
                    className={relationshipClass(relationship === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="mb-[18px] rounded-[12px] border border-error-border bg-surface px-4 py-[11px] text-[13.5px] font-semibold text-error-text"
                >
                  {submitError}
                </p>
              )}
            </>
          )}

          {isSent && sentResult && (
            <div className="mb-[22px] rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px] text-center">
              <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-[#A88526]">
                CÓDIGO DE INVITACIÓN
              </div>
              <div className="font-heading text-[34px] font-semibold tracking-[7px] text-[#8A7234]">
                {sentResult.code}
              </div>
              <div className="mt-[6px] text-[13px] text-[#A88526]">
                Vence en 7 días
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isSent}
            className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-4 py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isSent && <PlaneIcon />}
            {isSubmitting
              ? "Enviando…"
              : isSent
                ? "Invitación enviada"
                : "Enviar invitación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function validateEmail(value: string): string | undefined {
  if (value.trim() === "") {
    return "Ingresá el email";
  }
  if (!isValidEmail(value)) {
    return "Ingresá un email válido";
  }
  return undefined;
}

function inputClass(hasError: boolean, isDisabled: boolean): string {
  const base =
    "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-placeholder";
  return `${base} ${hasError ? "border-error-border" : "border-field-border"} ${
    isDisabled ? "disabled:opacity-60" : ""
  }`;
}

function relationshipClass(isSelected: boolean): string {
  const base =
    "flex-1 rounded-full border-[1.5px] px-2 py-[11px] text-[14px] font-extrabold disabled:opacity-60";
  if (isSelected) {
    return `${base} border-[#9FB8EC] bg-[#CCD8F4] text-[#4E72C8]`;
  }
  return `${base} border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]`;
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="mb-[18px] mt-[6px] text-[13px] font-semibold text-error-text">
      {message}
    </p>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4E72C8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[1px] flex-none"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function PlaneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}