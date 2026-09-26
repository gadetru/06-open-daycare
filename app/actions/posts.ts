"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  isValidPostAudience,
  isValidPostType,
  validatePhoto,
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
type ChildConsentRow = { id: string; full_name: string; photo_consent: boolean };

// La extensión sale del mime validado, nunca del nombre del archivo.
function getPhotoExtension(mimeType: string): string | null {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return null;
}

export async function createPost(
  input: CreatePostInput,
  photo?: File | null
): Promise<CreatePostResult> {
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

  const hasPhoto = photo !== null && photo !== undefined;
  if (photo) {
    const photoError = validatePhoto(photo);
    if (photoError) {
      return { ok: false, error: photoError };
    }
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
  // El consentimiento también se verifica acá, antes de crear el post y de
  // subir nada: si se rechaza, no queda ni post ni archivo en el bucket.
  if (input.audience === "children") {
    const { data: existingChildren, error: childrenError } = await supabase
      .from("children")
      .select("id, full_name, photo_consent")
      .in("id", childIds);

    const foundChildren = (existingChildren ?? []) as ChildConsentRow[];
    if (childrenError || foundChildren.length !== childIds.length) {
      return { ok: false, error: "No se pudo verificar los niños elegidos" };
    }

    if (hasPhoto) {
      const blockedChild = [...foundChildren].sort((firstChild, secondChild) =>
        firstChild.full_name.localeCompare(secondChild.full_name)
      ).find((child) => !child.photo_consent);
      if (blockedChild) {
        return {
          ok: false,
          error: `No se puede publicar la foto: ${blockedChild.full_name} no tiene consentimiento para fotos`,
        };
      }
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

  const postId = (insertedPost as PostRowWithId).id;

  // La primera carpeta del path es el autor: así la policy de
  // `storage.objects` autoriza la subida con una sola comparación.
  let storagePath: string | null = null;
  if (photo) {
    const extension = getPhotoExtension(photo.type);
    if (!extension) {
      return { ok: false, error: "La foto tiene que ser JPG, PNG o WebP" };
    }
    storagePath = `${authorId}/${postId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("post-photos")
      .upload(storagePath, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: "No se pudo subir la foto" };
    }
  }

  if (input.audience === "children") {
    const { error: recipientsError } = await supabase
      .from("post_children")
      .insert(childIds.map((childId) => ({ post_id: postId, child_id: childId })));

    if (recipientsError) {
      await removeUploadedPhoto(supabase, storagePath);
      return { ok: false, error: "No se pudo guardar los destinatarios" };
    }
  }

  if (storagePath) {
    const { error: photoRowError } = await supabase
      .from("post_photos")
      .insert({ post_id: postId, storage_path: storagePath, position: 0 });

    if (photoRowError) {
      await removeUploadedPhoto(supabase, storagePath);
      return { ok: false, error: "No se pudo guardar la foto" };
    }
  }

  return { ok: true };
}

// Best-effort: si la DB rechaza la fila después de subir el archivo, se borra
// el objeto para no dejar huérfanos en el bucket. Nunca filtra paths.
async function removeUploadedPhoto(
  supabase: ReturnType<typeof createClient>,
  storagePath: string | null
): Promise<void> {
  if (!storagePath) {
    return;
  }
  try {
    await supabase.storage.from("post-photos").remove([storagePath]);
  } catch {
    // Intencionalmente vacío: el error ya se reporta arriba.
  }
}
