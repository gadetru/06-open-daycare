import Link from "next/link";
import SunIcon from "../components/shared/SunIcon";

export default function ActivarCuentaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-bg p-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
          <SunIcon size={30} />
        </div>

        <h1 className="mb-[8px] font-heading text-[32px] font-semibold leading-[1.15] text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="mb-[26px] text-[15.5px] leading-[1.55] text-ink-muted">
          Te invitaron a seguir el día de tu hijo. Creá tu contraseña para
          activar la cuenta.
        </p>

        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-field-border bg-white p-[14px_16px]">
          <div className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-avatar-sky-bg font-heading text-[19px] font-semibold text-avatar-sky-ink">
            M
          </div>
          <div>
            <div className="text-[13px] text-ink-muted">
              Te invitaron a seguir a
            </div>
            <div className="font-heading text-[17px] font-semibold text-ink">
              Mateo · Sala Soles
            </div>
          </div>
        </div>

        <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
          CÓDIGO DE INVITACIÓN
        </div>
        <input
          defaultValue="7K4P9"
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] font-heading text-[18px] font-bold tracking-[3px] text-ink outline-none"
        />

        <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
          EMAIL
        </div>
        <input
          type="email"
          defaultValue="lucia.fernandez@gmail.com"
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] text-[15px] text-ink outline-none"
        />

        <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
          CREAR CONTRASEÑA
        </div>
        <input
          type="password"
          defaultValue="contraseña"
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#F2A78E] bg-white p-[14px_16px] text-[15px] text-ink outline-none"
        />

        <label className="mb-[24px] flex cursor-pointer items-start gap-[12px] rounded-[14px] bg-[#FBF1D6] p-[14px_16px]">
          <span className="mt-[1px] flex h-[24px] w-[24px] flex-none items-center justify-center rounded-[8px] bg-[#5FB97E]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[14px] leading-[1.45] text-[#8A7234]">
            Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro
            de la app.
          </span>
        </label>

        <Link
          href="/familia-feed"
          className="block w-full rounded-[15px] bg-gradient-to-b from-accent-1 to-accent-2 p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
        >
          Activar mi cuenta
        </Link>

        <p className="mt-[22px] text-center text-[14.5px] text-ink-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-extrabold text-coral-deep">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}