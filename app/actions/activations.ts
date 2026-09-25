"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const INVITATION_MIN_PASSWORD_LENGTH = 6;

export type ActivationContextResult =
  | { ok: true; kidName: string; roomName: string }
  | { ok: false; message: string };

export type ActivateParentAccountInput = {
  code: string;
  email: string;
  password: string;
};

export type ActivateParentAccountResult = {
  ok: false;
  error: string;
};

function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return (value ?? null) as T | null;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function isPasswordValid(password: string): boolean {
  return password.length >= INVITATION_MIN_PASSWORD_LENGTH;
}

function isEmailAlreadyRegistered(error: { message?: string; code?: string } | null): boolean {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  return (
    code.includes("email_exists") ||
    code.includes("user_already_exists") ||
    message.includes("already registered") ||
    message.includes("already been registered")
  );
}

export async function getActivationContext(
  code: string,
  email: string,
): Promise<ActivationContextResult> {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedCode) {
    return { ok: false, message: "Ingresá el código de la invitación" };
  }
  if (!normalizedEmail) {
    return { ok: false, message: "Ingresá el email de la invitación" };
  }

  const admin = createAdmin();
  if (!admin) {
    return { ok: false, message: "No se pudo validar la invitación, reintentá" };
  }

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, child_id, email, status, expires_at")
    .eq("code", normalizedCode)
    .single();

  if (!invitation || invitation.email.toLowerCase() !== normalizedEmail) {
    return { ok: false, message: "El código es inválido o venció" };
  }
  if (invitation.status !== "pending") {
    return { ok: false, message: "El código es inválido o venció" };
  }
  if (isExpired(invitation.expires_at)) {
    return { ok: false, message: "El código es inválido o venció" };
  }

  const { data: childData } = await admin
    .from("children")
    .select("full_name, rooms(name)")
    .eq("id", invitation.child_id)
    .single();

  if (!childData || !childData.full_name) {
    return { ok: false, message: "No se pudo obtener la invitación, reintentá" };
  }

  const room = asObject<{ name: string }>(childData.rooms);

  return {
    ok: true,
    kidName: childData.full_name,
    roomName: room?.name ?? "",
  };
}

export async function activateParentAccount(
  input: ActivateParentAccountInput,
): Promise<ActivateParentAccountResult | undefined> {
  const code = input.code.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!code || !email) {
    return { ok: false, error: "Faltan datos de la invitación" };
  }
  if (!isPasswordValid(password)) {
    return { ok: false, error: `La contraseña debe tener al menos ${INVITATION_MIN_PASSWORD_LENGTH} caracteres` };
  }

  const admin = createAdmin();
  if (!admin) {
    return { ok: false, error: "No se pudo activar la cuenta, reintentá" };
  }

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, child_id, full_name, email, relationship, status, expires_at")
    .eq("code", code)
    .single();

  if (!invitation || invitation.email.toLowerCase() !== email) {
    return { ok: false, error: "El código es inválido o venció" };
  }
  if (invitation.status !== "pending") {
    return { ok: false, error: "El código es inválido o venció" };
  }
  if (isExpired(invitation.expires_at)) {
    return { ok: false, error: "El código es inválido o venció" };
  }

  const { data: childData } = await admin
    .from("children")
    .select("room_id, rooms(daycare_id)")
    .eq("id", invitation.child_id)
    .single();

  const room = childData ? asObject<{ daycare_id: string }>(childData.rooms) : null;
  const daycareId = room?.daycare_id;

  if (!daycareId) {
    return { ok: false, error: "No se pudo activar la cuenta, reintentá" };
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "parent", full_name: invitation.full_name },
  });

  if (createUserError || !createdUser?.user) {
    if (isEmailAlreadyRegistered(createUserError)) {
      return { ok: false, error: "Ya existe una cuenta con ese email" };
    }
    return { ok: false, error: "No se pudo crear tu cuenta, reintentá" };
  }

  const newUserId = createdUser.user.id;

  try {
    const { error: userInsertError } = await admin.from("users").insert({
      id: newUserId,
      daycare_id: daycareId,
      role: "parent",
      status: "active",
      full_name: invitation.full_name,
    });
    if (userInsertError) {
      throw userInsertError;
    }

    const { error: linkInsertError } = await admin.from("parent_children").insert({
      parent_id: newUserId,
      child_id: invitation.child_id,
      relationship: invitation.relationship,
    });
    if (linkInsertError) {
      throw linkInsertError;
    }

    const { error: invitationUpdateError } = await admin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
    if (invitationUpdateError) {
      throw invitationUpdateError;
    }
  } catch {
    await admin.auth.admin.deleteUser(newUserId).catch(() => {});
    return { ok: false, error: "No se pudo activar la cuenta, reintentá" };
  }

  redirect("/login?activated=1");
}