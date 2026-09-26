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

export function postRowToCard(row: PostRow): PostCardProps {
  const childFirstNames = row.child_names.map(getFirstName);

  return {
    id: row.id,
    type: POST_TYPE_CHIP[row.type],
    childName: childFirstNames[0] ?? "Anuncio general",
    time: formatTimeOfDay(row.published_at),
    author: row.author_name,
    text: row.body,
    recipient: buildRecipient(childFirstNames, row.room_name),
    likes: 0,
    comments: 0,
  };
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
