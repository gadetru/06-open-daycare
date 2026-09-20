import Link from "next/link";
import SunIcon from "../components/shared/SunIcon";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-auth-bg lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] px-[60px] py-[56px] text-white">
        <div className="absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-[rgba(255,255,255,.12)]" />
        <div className="absolute -bottom-[110px] -left-[80px] h-[300px] w-[300px] rounded-full bg-[rgba(255,255,255,.10)]" />

        <div className="relative flex items-center gap-[13px]">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[rgba(255,255,255,.22)]">
            <SunIcon size={26} />
          </div>
          <span className="font-heading text-[21px] font-semibold tracking-[.5px]">
            OpenDayCare
          </span>
        </div>

        <div className="relative">
          <h1 className="mb-[18px] font-heading text-[42px] font-semibold leading-[1.12]">
            El día de cada niño,
            <br />
            compartido con su familia.
          </h1>
          <p className="m-0 max-w-[430px] text-[17px] leading-[1.6] text-white/90">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>

        <div className="relative text-[14px] text-white/90">
          🌿 Guardería Sala Soles
        </div>
      </div>

      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[392px]">
          <h2 className="mb-[6px] font-heading text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h2>
          <p className="mb-[28px] text-[15px] text-ink-muted">
            Ingresá para ver el día de hoy.
          </p>

          <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
            EMAIL
          </div>
          <input
            type="email"
            defaultValue="caro@opendaycare.com"
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] text-[15px] text-ink outline-none"
          />

          <div className="mb-[8px] text-[12px] font-bold tracking-[.7px] text-ink-muted">
            CONTRASEÑA
          </div>
          <input
            type="password"
            placeholder="••••••••"
            className="mb-[10px] w-full rounded-[14px] border-[1.5px] border-field-border bg-white p-[14px_16px] text-[15px] text-ink outline-none placeholder:text-placeholder"
          />

          <div className="mb-[20px] text-right">
            <span className="cursor-pointer text-[13.5px] font-bold text-coral-deep">
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          <Link
            href="/familia-feed"
            className="block w-full rounded-[15px] bg-gradient-to-b from-accent-1 to-accent-2 p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
          >
            Iniciar sesión
          </Link>

          <p className="mt-[24px] text-center text-[14.5px] text-ink-muted">
            ¿Te invitó la guardería?{" "}
            <Link href="/activar-cuenta" className="font-extrabold text-coral-deep">
              Activá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}