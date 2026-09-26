// Los tipos del dominio de niños viven acá. Los datos ya no están hardcodeados:
// salen de `public.children` (ver `app/lib/kids-utils.ts`).
export type KidBadge = { label: string; bg: string; ink: string };

export type LinkedParent = {
  name: string;
  email: string;
  role: string;
  status: "ACTIVA" | "PENDIENTE";
};

export type Kid = {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarInk: string;
  age: number;
  room: string;
  allergyBadge?: KidBadge;
  note: string;
  birthDate: string;
  enrolledDate: string;
  parents: LinkedParent[];
};
