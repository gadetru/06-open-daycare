import type { Kid, KidBadge } from "../data/kids";
import type { RoomName } from "../data/rooms";
import {
  formatShortDate,
  getAgeInYears,
  getCurrentMonthYear,
  SHORT_MONTHS,
} from "./dates";

export type NewKidFields = {
  name: string;
  birthDate: Date;
  room: RoomName;
  allergies: string;
  note: string;
};

const AVATAR_PALETTES: ReadonlyArray<{ bg: string; ink: string }> = [
  { bg: "#A9D9E8", ink: "#1F7A93" },
  { bg: "#F4B8CC", ink: "#C44A7A" },
  { bg: "#B9DEC4", ink: "#3E8B62" },
  { bg: "#F4DC8E", ink: "#9A7B1E" },
  { bg: "#C9B6E8", ink: "#7B5FC0" },
];

export type ChildRow = {
  id: string;
  room_id: string;
  room_name: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
};

const ALLERGY_TAG_LABELS: Record<string, string> = {
  peanut: "MANÍ",
  lactose: "LACTOSA",
  gluten: "GLUTEN",
};

export function getAllergyBadge(tags: string[]): KidBadge | undefined {
  if (tags.length === 0) {
    return undefined;
  }
  const knownTag = tags.find((tag) => ALLERGY_TAG_LABELS[tag.toLowerCase()]);
  const label = knownTag
    ? ALLERGY_TAG_LABELS[knownTag.toLowerCase()]
    : tags[0].toUpperCase();
  return {
    label,
    bg: "#FBD8CC",
    ink: "#D9684A",
  };
}

export function childRowToKid(row: ChildRow, index: number): Kid {
  const [birthYear, birthMonth, birthDay] = row.birth_date.split("-").map(Number);
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  const [enrolledYear, enrolledMonth] = row.enrolled_at.split("-").map(Number);
  const cleanedName = row.full_name.trim();
  const avatar = getAvatarFor(index);

  return {
    id: row.id,
    name: cleanedName,
    initial: getInitial(cleanedName),
    avatarBg: avatar.bg,
    avatarInk: avatar.ink,
    age: getAgeInYears(birthDate),
    room: row.room_name,
    allergyBadge: getAllergyBadge(row.allergy_tags),
    note: (row.medical_notes ?? "").trim(),
    birthDate: formatShortDate(birthDay, birthMonth, birthYear),
    enrolledDate: `${SHORT_MONTHS[enrolledMonth - 1]} ${enrolledYear}`,
    parents: [],
  };
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export function getAvatarFor(index: number): { bg: string; ink: string } {
  return AVATAR_PALETTES[index % AVATAR_PALETTES.length];
}

export function buildNewKid(fields: NewKidFields, index: number): Kid {
  const day = fields.birthDate.getDate();
  const month = fields.birthDate.getMonth() + 1;
  const year = fields.birthDate.getFullYear();
  const cleanedName = fields.name.trim();
  const cleanedAllergies = fields.allergies.trim();
  const avatar = getAvatarFor(index);

  return {
    id: slugify(cleanedName),
    name: cleanedName,
    initial: getInitial(cleanedName),
    avatarBg: avatar.bg,
    avatarInk: avatar.ink,
    age: getAgeInYears(fields.birthDate),
    room: fields.room,
    allergyBadge: cleanedAllergies
      ? {
          label: cleanedAllergies.toUpperCase(),
          bg: "#FBD8CC",
          ink: "#D9684A",
        }
      : undefined,
    note: fields.note.trim(),
    birthDate: formatShortDate(day, month, year),
    enrolledDate: getCurrentMonthYear(),
    parents: [],
  };
}