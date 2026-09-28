import { redirect } from "next/navigation";
import { getAccountStatus } from "@/app/lib/require-role";

// Guard de servidor: solo parent entra a /familia.
// El staff va a /, la cuenta sin perfil a /sin-acceso y el no autenticado a
// /login.
export default async function FamiliaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getAccountStatus();

  if (account.status === "anonymous") {
    redirect("/login");
  }

  if (account.status === "no-profile") {
    redirect("/sin-acceso");
  }

  if (account.role === "staff" || account.role === "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
