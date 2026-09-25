"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SunIcon from "../components/shared/SunIcon";
import { activateParentAccount, getActivationContext } from "../actions/activations";

const MIN_PASSWORD_LENGTH = 6;

type InviteInfo = {
  kidName: string;
  roomName: string;
};

export default function ActivationForm() {
  const searchParams = useSearchParams();

  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [email] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasCode = code.trim().length > 0;
  const hasEmail = email.trim().length > 0;

  const emptyInviteError = !hasCode || !hasEmail
    ? !hasCode
      ? "Ingresá el código de la invitación"
      : "Ingresá el email de la invitación"
    : null;

  useEffect(() => {
    if (!code.trim() || !email.trim()) {
      return;
    }
    let cancelled = false;
    getActivationContext(code, email)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          setInvite({ kidName: result.kidName, roomName: result.roomName });
          setInviteError(null);
        } else {
          setInvite(null);
          setInviteError(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInvite(null);
          setInviteError("No se pudo validar la invitación, reintentá");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, email]);

  function handleCodeChange(value: string) {
    setCode(value);
    setTopError(null);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setPasswordError(null);
    setTopError(null);
  }

  function handleAuthorizationChange() {
    setAuthorized((previousValue) => !previousValue);
    setTopError(null);
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }
    setTopError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (!authorized) {
      setTopError("Debés autorizar las fotos para activar tu cuenta");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await activateParentAccount({ code, email, password });
      if (result && !result.ok) {
        setTopError(result.error);
      }
    } catch {
      setTopError("No se pudo activar la cuenta, reintentá");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isInviteReady = Boolean(invite) && !inviteError;
  const isButtonDisabled = isSubmitting || !isInviteReady;

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
        <SunIcon size={30} />
      </div>

      <h1 className="mb-[8px] font-heading text-[32px] font-semibold leading-[1.15] text-ink">
        Bienvenida a OpenDayCare
      </h1>
      <p className="mb-[26px] text-[15.5px] leading-[1.55] text-ink-muted">
        Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar
        la cuenta.
      </p>

      {invite ? (
        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-field-border bg-white p-[14px_16px]">
          <div className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-avatar-sky-bg font-heading text-[19px] font-semibold text-avatar-sky-ink">
            {invite.kidName.charAt(0)}
          </div>
          <div>
            <div className="text-[13px] text-ink-muted">Te invitaron a seguir a</div>
            <div className="font-heading text-[17px] font-semibold text-ink">
              {invite.kidName}
              {invite.roomName ? ` · Sala ${invite.roomName}` : ""}
            </div>
          </div>
        </div>
      ) : emptyInviteError || inviteError ? (
        <div className="mb-[22px] rounded-[16px] border-[1.5px] border-error-border bg-white p-[14px_16px]">
          <p className="text-[14.5px] font-semibold text-error-text">
            {emptyInviteError ?? inviteError}
          </p>
          <p className="mt-[4px] text-[13px] text-ink-muted">
            Comprobá el enlace que recibiste por email.
          </p>
        </div>
      ) : (
        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-field-border bg-white p-[14px_16px]">
          <div className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-avatar-sky-bg font-heading text-[19px] font-semibold text-avatar-sky-ink">
            …
          </div>
          <div className="text-[15px] text-ink-muted">Validando invitación…</div>
        </div>
      )}

      <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
        CÓDIGO DE INVITACIÓN
      </div>
      <input
        value={code}
        onChange={(event) => handleCodeChange(event.target.value)}
        placeholder="Ingresá el código de 5 letras"
        className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] font-heading text-[18px] font-bold tracking-[3px] text-ink uppercase outline-none"
      />

      <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
        EMAIL
      </div>
      <input
        type="email"
        value={email}
        readOnly
        className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] text-[15px] text-ink outline-none opacity-70"
      />

      <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
        CREAR CONTRASEÑA
      </div>
      <input
        type="password"
        value={password}
        onChange={(event) => handlePasswordChange(event.target.value)}
        placeholder="Mínimo 6 caracteres"
        className={`mb-[18px] w-full rounded-[14px] border-[1.5px] bg-white p-[14px_16px] text-[15px] text-ink outline-none ${
          passwordError ? "border-error-border" : "border-field-border"
        }`}
      />
      {passwordError && (
        <p className="mb-[18px] mt-[6px] text-[13px] font-semibold text-error-text">
          {passwordError}
        </p>
      )}

      <label className="mb-[10px] flex cursor-pointer items-start gap-[12px] rounded-[14px] bg-[#FBF1D6] p-[14px_16px]">
        <input
          type="checkbox"
          checked={authorized}
          onChange={handleAuthorizationChange}
          className="mt-[2px] h-[20px] w-[20px] flex-none accent-[#5FB97E]"
        />
        <span className="text-[14px] leading-[1.45] text-[#8A7234]">
          Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de
          la app.
        </span>
      </label>

      {topError && (
        <p className="mb-[16px] rounded-[12px] border border-error-border bg-surface px-4 py-[11px] text-[13.5px] font-semibold text-error-text">
          {topError}
        </p>
      )}

      <button
        type="submit"
        onClick={handleSubmit}
        disabled={isButtonDisabled}
        className="block w-full rounded-[15px] bg-gradient-to-b from-accent-1 to-accent-2 p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Activar mi cuenta
      </button>

      <p className="mt-[22px] text-center text-[14.5px] text-ink-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-extrabold text-coral-deep">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}