"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useState, type FormEvent } from "react";
import SunIcon from "../components/shared/SunIcon";
import LoginSuccessBanner from "./LoginSuccessBanner";
import { createClient } from "@/utils/supabase/client";

type InvalidField = "email" | "password";

type CredentialError = {
  field: InvalidField;
  input: HTMLInputElement;
  message: string;
};

function getCredentialError(form: HTMLFormElement): CredentialError | null {
  const emailInput = form.elements.namedItem("email");
  const passwordInput = form.elements.namedItem("password");

  if (emailInput instanceof HTMLInputElement && !emailInput.validity.valid) {
    const message = emailInput.validity.valueMissing
      ? "Ingresá tu correo electrónico."
      : "Ingresá un correo electrónico válido.";

    return { field: "email", input: emailInput, message };
  }

  if (
    passwordInput instanceof HTMLInputElement &&
    !passwordInput.validity.valid
  ) {
    return {
      field: "password",
      input: passwordInput,
      message: "Ingresá tu contraseña.",
    };
  }

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("caro@opendaycare.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function clearError() {
    setError("");
    setInvalidField(null);
  }

  function focusErrorMessage() {
    window.requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const credentialError = getCredentialError(event.currentTarget);

    if (credentialError) {
      setInvalidField(credentialError.field);
      setError(credentialError.message);
      credentialError.input.focus();
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const supabase = createClient();
      const { error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Email o contraseña incorrectos");
        setIsSubmitting(false);
        focusErrorMessage();
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Intentá nuevamente.");
      setIsSubmitting(false);
      focusErrorMessage();
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-auth-bg lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] px-[60px] py-[56px] text-[#1F1814]">
        <div aria-hidden="true" className="absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-[rgba(255,255,255,.12)]" />
        <div aria-hidden="true" className="absolute -bottom-[110px] -left-[80px] h-[300px] w-[300px] rounded-full bg-[rgba(255,255,255,.10)]" />

        <div className="relative flex items-center gap-[13px]">
          <div aria-hidden="true" className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[rgba(255,255,255,.22)]">
            <SunIcon size={26} />
          </div>
          <span className="font-heading text-[21px] font-semibold tracking-[.5px]">
            OpenDayCare
          </span>
        </div>

        <div className="relative">
          <p className="mb-[18px] font-heading text-[42px] font-semibold leading-[1.12]">
            El día de cada niño,
            <br />
            compartido con su familia.
          </p>
          <p className="m-0 max-w-[430px] text-[17px] leading-[1.6]">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>

        <p className="relative text-[14px]">
          <span aria-hidden="true">🌿</span> Guardería Sala Soles
        </p>
      </div>

      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[392px]">
          <h1 id="login-heading" className="mb-[6px] font-heading text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h1>
          <p className="mb-[28px] text-[15px] text-[#6E6359]">
            Ingresá para ver el día de hoy.
          </p>

          <Suspense fallback={null}>
            <LoginSuccessBanner />
          </Suspense>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="login-heading"
            aria-busy={isSubmitting}
          >
            <label
              htmlFor="email"
              className="mb-[8px] block text-[12px] font-bold tracking-[.7px] text-[#6E6359]"
            >
              EMAIL
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
              required
              aria-invalid={invalidField === "email" ? true : undefined}
              aria-describedby={
                invalidField === "email" ? "login-error" : undefined
              }
              className="mb-[18px] w-full scroll-mb-2 rounded-[14px] border-[1.5px] border-[#7A6B5D] bg-white p-[14px_16px] text-[15px] text-ink placeholder:text-[#6E6359] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E6359] aria-invalid:border-[#B42318]"
            />

            <label
              htmlFor="password"
              className="mb-[8px] block text-[12px] font-bold tracking-[.7px] text-[#6E6359]"
            >
              CONTRASEÑA
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              required
              aria-invalid={invalidField === "password" ? true : undefined}
              aria-describedby={
                invalidField === "password" ? "login-error" : undefined
              }
              className="mb-[10px] w-full scroll-mb-2 rounded-[14px] border-[1.5px] border-[#7A6B5D] bg-white p-[14px_16px] text-[15px] text-ink placeholder:text-[#6E6359] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E6359] aria-invalid:border-[#B42318]"
            />

            {error && (
              <p
                ref={errorRef}
                id="login-error"
                role="alert"
                aria-atomic="true"
                tabIndex={-1}
                className="mb-[12px] min-h-11 scroll-mb-2 text-[13.5px] font-semibold text-[#B42318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
              >
                {error}
              </p>
            )}

            <p className="mb-[20px] text-right text-[13.5px] font-semibold text-[#6E6359]">
              ¿Olvidaste tu contraseña?
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="block w-full scroll-mb-2 rounded-[15px] bg-gradient-to-b from-accent-1 to-accent-2 p-[15px] text-center text-[16px] font-extrabold text-[#1F1814] shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F1814] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
            <span className="sr-only" role="status">
              {isSubmitting ? "Iniciando sesión." : ""}
            </span>
          </form>

          <p className="mt-[24px] text-center text-[14.5px] text-[#6E6359]">
            ¿Te invitó la guardería?{" "}
            <Link
              href="/activar-cuenta"
              className="scroll-mb-2 rounded-sm font-extrabold text-[#B94A35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E6359]"
            >
              Activá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
