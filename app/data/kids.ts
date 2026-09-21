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

const allergyBadgeMani: KidBadge = {
  label: "MANÍ",
  bg: "#FBD8CC",
  ink: "#D9684A",
};

const allergyBadgeLactosa: KidBadge = {
  label: "LACTOSA",
  bg: "#FBD8CC",
  ink: "#D9684A",
};

export const kids: Kid[] = [
  {
    id: "mateo",
    name: "Mateo Fernández",
    initial: "M",
    avatarBg: "#A9D9E8",
    avatarInk: "#1F7A93",
    age: 3,
    room: "Soles",
    allergyBadge: allergyBadgeMani,
    note: "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
    birthDate: "12 mar 2022",
    enrolledDate: "feb 2025",
    parents: [
      {
        name: "Lucía Fernández",
        email: "lucia.fernandez@gmail.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
      {
        name: "Diego Fernández",
        email: "diego.fernandez@example.com",
        role: "Papá · invitación enviada",
        status: "PENDIENTE",
      },
    ],
  },
  {
    id: "sofia",
    name: "Sofía Méndez",
    initial: "S",
    avatarBg: "#F4B8CC",
    avatarInk: "#C44A7A",
    age: 2,
    room: "Soles",
    note: "Suave con los cambios de rutina. Le gusta la música y se calma con canciones.",
    birthDate: "19 jul 2023",
    enrolledDate: "mar 2025",
    parents: [
      {
        name: "Carolina Méndez",
        email: "carolina.mendez@example.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
    ],
  },
  {
    id: "benjamin",
    name: "Benjamín Ruiz",
    initial: "B",
    avatarBg: "#B9DEC4",
    avatarInk: "#3E8B62",
    age: 3,
    room: "Soles",
    note: "Alérgico a las nueces. Supervisar lonchera.",
    birthDate: "4 nov 2021",
    enrolledDate: "ene 2024",
    parents: [
      {
        name: "Florencia Ruiz",
        email: "florencia.ruiz@example.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
      {
        name: "Martín Ruiz",
        email: "martin.ruiz@example.com",
        role: "Papá · activa",
        status: "ACTIVA",
      },
    ],
  },
  {
    id: "valentina",
    name: "Valentina Soto",
    initial: "V",
    avatarBg: "#F4DC8E",
    avatarInk: "#9A7B1E",
    age: 2,
    room: "Soles",
    note: "En período de adaptación. La retiran al mediodía por ahora.",
    birthDate: "28 feb 2023",
    enrolledDate: "ago 2025",
    parents: [],
  },
  {
    id: "tomas",
    name: "Tomás Díaz",
    initial: "T",
    avatarBg: "#C9B6E8",
    avatarInk: "#7B5FC0",
    age: 3,
    room: "Soles",
    allergyBadge: allergyBadgeLactosa,
    note: "Intolerancia a la lactosa. Leche sin TACC y fórmula especial.",
    birthDate: "15 jun 2022",
    enrolledDate: "feb 2025",
    parents: [
      {
        name: "Gonzalo Díaz",
        email: "gonzalo.diaz@example.com",
        role: "Papá · activa",
        status: "ACTIVA",
      },
    ],
  },
  {
    id: "emma",
    name: "Emma Castro",
    initial: "E",
    avatarBg: "#F4B8CC",
    avatarInk: "#C44A7A",
    age: 2,
    room: "Soles",
    note: "Usa pañal de tela. Traer bolsita impermeable.",
    birthDate: "30 ago 2023",
    enrolledDate: "abr 2025",
    parents: [
      {
        name: "Laura Castro",
        email: "laura.castro@example.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
    ],
  },
  {
    id: "lucas",
    name: "Lucas Romero",
    initial: "L",
    avatarBg: "#A9D9E8",
    avatarInk: "#1F7A93",
    age: 3,
    room: "Soles",
    note: "Muy curioso. Asegurarse de supervisarlo en el patio de atrás.",
    birthDate: "22 oct 2021",
    enrolledDate: "ene 2024",
    parents: [
      {
        name: "Paula Romero",
        email: "paula.romero@example.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
    ],
  },
  {
    id: "olivia",
    name: "Olivia Vega",
    initial: "O",
    avatarBg: "#B9DEC4",
    avatarInk: "#3E8B62",
    age: 2,
    room: "Soles",
    note: "Vegetariana: no dar carnes ni caldos con carne.",
    birthDate: "5 may 2023",
    enrolledDate: "mar 2025",
    parents: [
      {
        name: "Rocío Vega",
        email: "rocio.vega@example.com",
        role: "Mamá · activa",
        status: "ACTIVA",
      },
    ],
  },
];