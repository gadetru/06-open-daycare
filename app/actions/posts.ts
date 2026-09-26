"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  isValidPostAudience,
  isValidPostType,
  type PostAudience,
  type PostTypeValue,
} from "@/app/lib/posts-utils";

export type CreatePostInput = {
  type: PostTypeValue;
  body: string;
  audience: PostAudience;
  childIds: string[];
};

export type CreatePostResult = { ok: true } | { ok: false; error: string };

type StaffRow = { room_id: string | null };
type PostRowWithId = { id: string };

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  if (!isValidPostType(input.type)) {
    return { ok: false, error: "Elegí un tipo" };
  }

  const body = input.body.trim();
  if (body.length === 0) {
    return { ok: false, error: "Escribí una descripción" };
  }

  if (!isValidPostAudience(input.audience)) {
    return { ok: false, error: "Elegí al menos un destinatario" };
  }

  const childIds = [...new Set(input.childIds ?? [])].filter(
    (childId) => typeof childId === "string" && childId.length > 0
  );

  if (input.audience === "children" && childIds.length === 0) {
    return { ok: false, error: "Elegí al menos un destinatario" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: claimsData } = await supabase.auth.getClaims();
  const authorId = claimsData?.claims?.sub;
  if (typeof authorId !== "string" || authorId.length === 0) {
    return { ok: false, error: "No iniciaste sesión" };
  }

  // La sala del staff: "Toda la sala" publica con room_id = su sala.
  const { data: staffRow, error: staffError } = await supabase
    .from("users")
    .select("room_id")
    .eq("id", authorId)
    .single();

  if (staffError || !staffRow) {
    return { ok: false, error: "No se pudo verificar tu usuario" };
  }

  const staffRoomId = (staffRow as StaffRow).room_id;
  if (input.audience === "room" && !staffRoomId) {
    return { ok: false, error: "No tenés una sala asignada" };
  }

  const roomId = input.audience === "room" ? staffRoomId : null;

  // Los niños se verifican antes de crear el post: si el insert de
  // post_children fallara después no habría forma de borrar el post (esta tabla
  // no tiene DELETE) y quedaría una publicación sin destinatarios.
  if (input.audience === "children") {
    const { data: existingChildren, error: childrenError } = await supabase
      .from("children")
      .select("id")
      .in("id", childIds);

    const foundChildren = (existingChildren ?? []) as unknown[];
    if (childrenError || foundChildren.length !== childIds.length) {
      return { ok: false, error: "No se pudo verificar los niños elegidos" };
    }
  }

  const { data: insertedPost, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      room_id: roomId,
      type: input.type,
      body,
    })
    .select("id")
    .single();

  if (postError || !insertedPost) {
    return { ok: false, error: "No se pudo publicar" };
  }

  if (input.audience === "children") {
    const postId = (insertedPost as PostRowWithId).id;
    const { error: recipientsError } = await supabase
      .from("post_children")
      .insert(childIds.map((childId) => ({ post_id: postId, child_id: childId })));

    if (recipientsError) {
      return { ok: false, error: "No se pudo guardar los destinatarios" };
    }
  }

  return { ok: true };
}
