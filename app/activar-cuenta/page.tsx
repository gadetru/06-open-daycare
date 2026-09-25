import { Suspense } from "react";
import ActivationForm from "./ActivationForm";

export default function ActivarCuentaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-bg p-10">
      <Suspense fallback={<ActivationFallback />}>
        <ActivationForm />
      </Suspense>
    </div>
  );
}

function ActivationFallback() {
  return (
    <p className="text-[14.5px] text-ink-muted">
      Cargando invitación…
    </p>
  );
}