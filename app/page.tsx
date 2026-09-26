import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import FeedClient from "./components/home/FeedClient";
import type { PostChildOption } from "./components/home/CreatePostModal";
import { getAvatarFor, getInitial } from "./lib/kids-utils";
import { groupPostsByDay, type PostRow } from "./lib/posts-utils";
import { formatHeaderDate } from "./lib/dates";

type StaffRow = { full_name: string; daycare_id: string; room_id: string | null };
type RoomRow = { name: string };
type DaycareRow = { name: string };
type ChildRow = { id: string; full_name: string };
type AuthorRow = { full_name: string } | null;
type RoomNameRow = { name: string } | null;

type PostQueryRow = {
  id: string;
  author_id: string;
  room_id: string | null;
  type: PostRow["type"];
  title: string | null;
  body: string;
  published_at: string;
  author: AuthorRow;
  room: RoomNameRow;
};

type PostChildQueryRow = {
  post_id: string;
  child_id: string;
};

type FeedData = {
  daycareName: string | null;
  staffName: string | null;
  roomName: string | null;
  todayLabel: string;
  kids: PostChildOption[];
  postsByDay: ReturnType<typeof groupPostsByDay>;
  notice: string | null;
};

const POST_SELECT =
  "id, author_id, room_id, type, title, body, published_at, " +
  "author:users!posts_author_id_fkey(full_name), " +
  "room:rooms!posts_room_id_fkey(name)";

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const feed = await loadFeedData(supabase);

  return (
    <FeedClient
      daycareName={feed.daycareName}
      staffName={feed.staffName}
      roomName={feed.roomName}
      todayLabel={feed.todayLabel}
      kids={feed.kids}
      dayGroups={feed.postsByDay}
      notice={feed.notice}
    />
  );
}

// La RLS ya filtra: el staff solo lee posts de staff de su guardería.
async function loadPostRows(supabase: SupabaseClient): Promise<PostRow[]> {
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("published_at", { ascending: false });

  if (postsError) {
    throw postsError;
  }

  const postRows = (postsData ?? []) as unknown as PostQueryRow[];
  const childNamesByPostId = await loadChildNamesByPostId(supabase, postRows);

  return postRows.map((post) => ({
    id: post.id,
    author_id: post.author_id,
    room_id: post.room_id,
    type: post.type,
    title: post.title,
    body: post.body,
    published_at: post.published_at,
    author_name: post.author?.full_name ?? "",
    room_name: post.room?.name ?? null,
    child_names: childNamesByPostId.get(post.id) ?? [],
  }));
}

// Los nombres de los destinatarios se resuelven con dos consultas planas
// (post_children y children) en vez de anidar: el resultado es más fácil de leer.
async function loadChildNamesByPostId(
  supabase: SupabaseClient,
  postRows: PostQueryRow[]
): Promise<Map<string, string[]>> {
  const childNamesByPostId = new Map<string, string[]>();
  const postIds = postRows.map((post) => post.id);

  if (postIds.length === 0) {
    return childNamesByPostId;
  }

  const { data: linksData, error: linksError } = await supabase
    .from("post_children")
    .select("post_id, child_id")
    .in("post_id", postIds);

  if (linksError) {
    throw linksError;
  }

  const links = (linksData ?? []) as PostChildQueryRow[];
  const childIds = [...new Set(links.map((link) => link.child_id))];
  const nameByChildId = new Map<string, string>();

  if (childIds.length > 0) {
    const { data: childData, error: childrenError } = await supabase
      .from("children")
      .select("id, full_name")
      .in("id", childIds);

    if (childrenError) {
      throw childrenError;
    }

    for (const child of (childData ?? []) as ChildRow[]) {
      nameByChildId.set(child.id, child.full_name);
    }
  }

  for (const link of links) {
    const childName = nameByChildId.get(link.child_id);
    if (!childName) {
      continue;
    }
    const names = childNamesByPostId.get(link.post_id) ?? [];
    childNamesByPostId.set(link.post_id, [...names, childName]);
  }

  return childNamesByPostId;
}

// Los niños del modal son los de la sala del staff, leídos de la base.
async function loadRoomKids(
  supabase: SupabaseClient,
  roomId: string
): Promise<PostChildOption[]> {
  const { data: childData, error: childrenError } = await supabase
    .from("children")
    .select("id, full_name")
    .eq("room_id", roomId)
    .eq("status", "active")
    .order("full_name");

  if (childrenError) {
    throw childrenError;
  }

  return ((childData ?? []) as ChildRow[]).map((child, index) => {
    const avatar = getAvatarFor(index);
    return {
      id: child.id,
      firstName: child.full_name.split(" ")[0],
      initial: getInitial(child.full_name),
      avatarBg: avatar.bg,
      avatarInk: avatar.ink,
    };
  });
}

// El nombre de la guardería se lee una vez y se muestra en el encabezado.
async function loadDaycareName(
  supabase: SupabaseClient,
  daycareId: string
): Promise<string | null> {
  const { data: daycareData, error: daycareError } = await supabase
    .from("daycares")
    .select("name")
    .eq("id", daycareId)
    .maybeSingle();

  if (daycareError) {
    throw daycareError;
  }

  return (daycareData as DaycareRow | null)?.name ?? null;
}

async function loadRoomName(
  supabase: SupabaseClient,
  roomId: string
): Promise<string | null> {
  const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  return (roomData as RoomRow | null)?.name ?? null;
}

async function loadFeedData(supabase: SupabaseClient): Promise<FeedData> {
  const emptyFeed: FeedData = {
    daycareName: null,
    staffName: null,
    roomName: null,
    todayLabel: formatHeaderDate(new Date()),
    kids: [],
    postsByDay: [],
    notice: null,
  };

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (typeof userId !== "string" || userId.length === 0) {
      return { ...emptyFeed, notice: "Iniciá sesión para ver el feed." };
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, daycare_id, room_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const staff = userData as StaffRow | null;
    const roomId = staff?.room_id ?? null;
    const daycareName = staff
      ? await loadDaycareName(supabase, staff.daycare_id)
      : null;
    const roomName = roomId ? await loadRoomName(supabase, roomId) : null;
    const kids = roomId ? await loadRoomKids(supabase, roomId) : [];
    const postsByDay = groupPostsByDay(await loadPostRows(supabase));

    return {
      daycareName,
      staffName: staff?.full_name ?? null,
      roomName,
      todayLabel: formatHeaderDate(new Date()),
      kids,
      postsByDay,
      notice: null,
    };
  } catch {
    return {
      ...emptyFeed,
      notice: "No se pudo cargar el feed. Reintentá más tarde.",
    };
  }
}
