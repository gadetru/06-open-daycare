import type { PostCardProps, PostType } from "../components/shared/PostCard";
import { formatDayDividerLabel, getLocalDayKey } from "./dates";

// Los 7 valores del enum `public.post_type`. En el orden de `@db-schema`.
export const POST_TYPE_VALUES = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
] as const;

export type PostTypeValue = (typeof POST_TYPE_VALUES)[number];

// Los tres destinos del modal. "room" y "daycare" no llevan niños: la diferencia
// es si el post queda atado a la sala del staff o a toda la guardería.
export const POST_AUDIENCES = ["room", "daycare", "children"] as const;

export type PostAudience = (typeof POST_AUDIENCES)[number];

// Traducción valor de DB → chip de la UI (el mapeo inverso de `@db-schema`).
const POST_TYPE_CHIP: Record<PostTypeValue, PostType> = {
  meal: "COMIDA",
  nap: "SIESTA",
  activity: "ACTIVIDAD",
  achievement: "LOGRO",
  mood: "ÁNIMO",
  photo: "FOTO",
  announcement: "ANUNCIO",
};

// SPEC 14: una sola foto por publicación, como máximo 5 MB y solo estos tipos.
// El bucket `post-photos` repite el límite y los mimes como defense in depth.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Valida la foto del modal y de la server action con los mismos mensajes en
// español. `null` (publicar sin foto) siempre es válido.
export function validatePhoto(photo: File | null | undefined): string | null {
  if (!photo) {
    return null;
  }
  if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
    return "La foto tiene que ser JPG, PNG o WebP";
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return "La foto es muy grande: máximo 5 MB";
  }
  return null;
}

// Fila de `posts` con lo que ya resolvió el server component (joins a `users`,
// `rooms` y `children`).
export type PostRow = {
  id: string;
  author_id: string;
  room_id: string | null;
  type: PostTypeValue;
  title: string | null;
  body: string;
  published_at: string;
  author_name: string;
  room_name: string | null;
  child_names: string[];
  photo_path: string | null;
  photo_signed_url: string | null;
};

// Un día del feed, con su divisor y las publicaciones de ese día.
export type PostDayGroup = {
  dayKey: string;
  label: string;
  posts: PostCardProps[];
};

export function getFirstName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

export function buildRecipient(
  childFirstNames: string[],
  roomName: string | null
): string {
  if (childFirstNames.length === 0) {
    return roomName ? "toda la sala" : "toda la guardería";
  }

  if (childFirstNames.length === 1) {
    return `familia de ${childFirstNames[0]}`;
  }

  const allButLast = childFirstNames.slice(0, -1).join(", ");
  return `familias de ${allButLast} y ${childFirstNames[childFirstNames.length - 1]}`;
}

// El título de la card tiene tres variantes: el primer niño si el post es para
// niños concretos, "Toda la sala" si el post tiene sala, y "Anuncio general" si
// es un anuncio de toda la guardería.
export function getCardTitle(
  childFirstNames: string[],
  roomName: string | null
): string {
  if (childFirstNames.length > 0) {
    return childFirstNames[0];
  }
  return roomName ? "Toda la sala" : "Anuncio general";
}

export function postRowToCard(row: PostRow): PostCardProps {
  const childFirstNames = row.child_names.map(getFirstName);

  return {
    id: row.id,
    type: POST_TYPE_CHIP[row.type],
    childName: getCardTitle(childFirstNames, row.room_name),
    time: formatTimeOfDay(row.published_at),
    author: row.author_name,
    text: row.body,
    recipient: buildRecipient(childFirstNames, row.room_name),
    likes: 0,
    comments: 0,
    image: toCardImage(row.photo_signed_url, childFirstNames),
  };
}

// La card solo sabe renderizar una imagen: si no hay URL firmada, no hay foto
// y la card se ve igual que en SPEC 13.
function toCardImage(
  photoSignedUrl: string | null,
  childFirstNames: string[]
): PostCardProps["image"] {
  if (!photoSignedUrl) {
    return undefined;
  }
  const alt =
    childFirstNames.length > 0
      ? `Foto de ${childFirstNames[0]}`
      : "Foto del anuncio";
  return { src: photoSignedUrl, alt };
}

// Agrupa las publicaciones por día local, de la más reciente a la más antigua.
export function groupPostsByDay(rows: PostRow[]): PostDayGroup[] {
  const rowsByDate = [...rows].sort(
    (firstRow, secondRow) =>
      new Date(secondRow.published_at).getTime() -
      new Date(firstRow.published_at).getTime()
  );

  const groups: PostDayGroup[] = [];

  for (const row of rowsByDate) {
    const dayKey = getLocalDayKey(new Date(row.published_at));
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.dayKey === dayKey) {
      lastGroup.posts.push(postRowToCard(row));
      continue;
    }

    groups.push({
      dayKey,
      label: formatDayDividerLabel(row.published_at),
      posts: [postRowToCard(row)],
    });
  }

  return groups;
}

// "HH:MM" en hora local, que es como lo ve la staff en su pantalla.
function formatTimeOfDay(publishedAt: string): string {
  const publishedDate = new Date(publishedAt);
  const hours = String(publishedDate.getHours()).padStart(2, "0");
  const minutes = String(publishedDate.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// La server action no confía en lo que le manda el navegador: valida que el tipo
// y el destino sean valores del enum antes de tocar la base.
export function isValidPostType(value: unknown): value is PostTypeValue {
  return (
    typeof value === "string" &&
    (POST_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function isValidPostAudience(value: unknown): value is PostAudience {
  return (
    typeof value === "string" &&
    (POST_AUDIENCES as readonly string[]).includes(value)
  );
}
