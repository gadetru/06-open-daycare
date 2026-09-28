import { redirect } from "next/navigation";
import { getAccountStatus } from "@/app/lib/require-role";

// Guard de servidor: solo staff (admin se trata como staff) entra al panel.
// El padre va a /familia, la cuenta sin perfil a /sin-acceso y el no
// autenticado a /login.
export default async function StaffLayout({
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

  if (account.role === "parent") {
    redirect("/familia");
  }

  return <>{children}</>;
}
