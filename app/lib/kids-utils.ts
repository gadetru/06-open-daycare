import type { Kid, KidBadge } from "../data/kids";
import { formatShortDate, getAgeInYears, SHORT_MONTHS } from "./dates";

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

export type NewChildFields = {
  fullName: string;
  birthDate: string;
  roomId: string;
  allergyTags: string[];
  medicalNotes: string;
  enrolledAt: string;
  photoConsent: boolean;
};

const ALLERGY_TAG_TRANSLATIONS: Record<string, string> = {
  mani: "peanut",
  lactosa: "lactose",
  gluten: "gluten",
};

export function parseAllergyTags(raw: string): string[] {
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const cleaned = part
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!cleaned) {
      continue;
    }
    const tag = ALLERGY_TAG_TRANSLATIONS[cleaned] ?? cleaned;
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

export function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export function getAvatarFor(index: number): { bg: string; ink: string } {
  return AVATAR_PALETTES[index % AVATAR_PALETTES.length];
}