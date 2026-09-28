import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import FamiliaClient from "@/app/components/familia/FamiliaClient";
import { groupPostsByDay, type PostRow } from "@/app/lib/posts-utils";
import { formatHeaderDate } from "@/app/lib/dates";

type ParentRow = { full_name: string; daycare_id: string };
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
  post_photos: PostPhotoQueryRow[] | null;
};

type PostPhotoQueryRow = {
  storage_path: string;
};

type PostChildQueryRow = {
  post_id: string;
  child_id: string;
};

type FamilyFeedData = {
  parentName: string | null;
  childNames: string[];
  daycareName: string | null;
  todayLabel: string;
  postsByDay: ReturnType<typeof groupPostsByDay>;
  notice: string | null;
  hasLinkedChildren: boolean;
};

const POST_SELECT =
  "id, author_id, room_id, type, title, body, published_at, " +
  "author:users!posts_author_id_fkey(full_name), " +
  "room:rooms!posts_room_id_fkey(name), " +
  "post_photos(storage_path)";

export default async function FamiliaPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const feed = await loadFamilyFeedData(supabase);

  return (
    <FamiliaClient
      parentName={feed.parentName}
      childNames={feed.childNames}
      daycareName={feed.daycareName}
      todayLabel={feed.todayLabel}
      dayGroups={feed.postsByDay}
      notice={feed.notice}
      hasLinkedChildren={feed.hasLinkedChildren}
    />
  );
}

// La RLS ya filtra: el padre solo lee etiquetados a sus hijos + anuncios
// generales. El loader no duplica esa regla, solo ordena y firma fotos.
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
  const signedUrlByPostId = await loadSignedUrlByPostId(supabase, postRows);

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
    photo_path: photoPathOf(post),
    photo_signed_url: signedUrlByPostId.get(post.id) ?? null,
  }));
}

function photoPathOf(post: PostQueryRow): string | null {
  const photos = post.post_photos ?? [];
  return photos.length > 0 ? photos[0].storage_path : null;
}

async function loadSignedUrlByPostId(
  supabase: SupabaseClient,
  postRows: PostQueryRow[]
): Promise<Map<string, string>> {
  const signedUrlByPostId = new Map<string, string>();

  for (const post of postRows) {
    const storagePath = photoPathOf(post);
    if (!storagePath) {
      continue;
    }

    const { data, error } = await supabase.storage
      .from("post-photos")
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      continue;
    }
    signedUrlByPostId.set(post.id, data.signedUrl);
  }

  return signedUrlByPostId;
}

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

// Solo datos reducidos: nombre del padre, nombres de sus hijos y daycare.
// Sin birth_date, alergias, notas médicas ni consentimientos.
async function loadFamilyFeedData(
  supabase: SupabaseClient
): Promise<FamilyFeedData> {
  const emptyFeed: FamilyFeedData = {
    parentName: null,
    childNames: [],
    daycareName: null,
    todayLabel: formatHeaderDate(new Date()),
    postsByDay: [],
    notice: null,
    hasLinkedChildren: false,
  };

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (typeof userId !== "string" || userId.length === 0) {
      return { ...emptyFeed, notice: "Iniciá sesión para ver las novedades." };
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, daycare_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const parent = userData as ParentRow | null;
    if (!parent) {
      return { ...emptyFeed, notice: "No se pudo cargar las novedades." };
    }

    const { data: linkData, error: linksError } = await supabase
      .from("parent_children")
      .select("child_id")
      .eq("parent_id", userId);

    if (linksError) {
      throw linksError;
    }

    const childIds = ((linkData ?? []) as { child_id: string }[]).map(
      (link) => link.child_id
    );

    if (childIds.length === 0) {
      const daycareName = await loadDaycareName(supabase, parent.daycare_id);
      return {
        ...emptyFeed,
        parentName: parent.full_name,
        daycareName,
        hasLinkedChildren: false,
      };
    }

    const { data: childData, error: childrenError } = await supabase
      .from("children")
      .select("id, full_name")
      .in("id", childIds)
      .order("full_name");

    if (childrenError) {
      throw childrenError;
    }

    const linkedChildren = (childData ?? []) as ChildRow[];
    const daycareName = await loadDaycareName(supabase, parent.daycare_id);
    const postsByDay = groupPostsByDay(await loadPostRows(supabase));

    return {
      parentName: parent.full_name,
      childNames: linkedChildren.map((child) => child.full_name),
      daycareName,
      todayLabel: formatHeaderDate(new Date()),
      postsByDay,
      notice: null,
      hasLinkedChildren: true,
    };
  } catch {
    return {
      ...emptyFeed,
      notice: "No se pudo cargar las novedades. Reintentá más tarde.",
    };
  }
}

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
