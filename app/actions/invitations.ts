"use server";

import { randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const INVITATION_VALID_DAYS = 7;
const MAX_CODE_ATTEMPTS = 3;

const VALID_RELATIONSHIPS = ["father", "mother", "guardian"] as const;

export type ParentRelationshipValue = (typeof VALID_RELATIONSHIPS)[number];

export type CreateParentInvitationInput = {
  childId: string;
  fullName: string;
  email: string;
  relationship: ParentRelationshipValue;
};

export type CreateParentInvitationResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string };

type ChildWithRoom = {
  full_name: string;
  rooms: { name: string } | { name: string }[] | null;
};

export async function createParentInvitation(
  input: CreateParentInvitationInput,
): Promise<CreateParentInvitationResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim();

  if (fullName.length === 0) {
    return { ok: false, error: "El nombre es obligatorio" };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresá un email válido" };
  }
  if (!VALID_RELATIONSHIPS.includes(input.relationship)) {
    return { ok: false, error: "Parentesco inválido" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: claimsData } = await supabase.auth.getClaims();
  const staffUserId = claimsData?.claims?.sub;
  if (typeof staffUserId !== "string" || staffUserId.length === 0) {
    return { ok: false, error: "No iniciaste sesión" };
  }

  const { data: childRow, error: childError } = await supabase
    .from("children")
    .select("full_name, rooms(name)")
    .eq("id", input.childId)
    .eq("status", "active")
    .single();

  if (childError || !childRow) {
    return { ok: false, error: "No se pudo verificar el niño" };
  }

  const child = childRow as unknown as ChildWithRoom;
  const roomName = Array.isArray(child.rooms)
    ? (child.rooms[0]?.name ?? "")
    : (child.rooms?.name ?? "");

  let code = "";
  let expiresAt = "";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const generatedCode = generateCode();
    const expires = new Date();
    expires.setDate(expires.getDate() + INVITATION_VALID_DAYS);

    const { data: insertedRow, error: insertError } = await supabase
      .from("invitations")
      .insert({
        child_id: input.childId,
        invited_by: staffUserId,
        full_name: fullName,
        email,
        relationship: input.relationship,
        code: generatedCode,
        expires_at: expires.toISOString(),
      })
      .select("code, expires_at")
      .single();

    if (!insertError && insertedRow) {
      code = (insertedRow as { code: string }).code;
      expiresAt = (insertedRow as { expires_at: string }).expires_at;
      break;
    }
  }

  if (!code) {
    return { ok: false, error: "No se pudo generar el código, reintentá" };
  }

  const baseUrl = await resolveBaseUrl();
  const activationUrl = `${baseUrl}/activar-cuenta?code=${code}&email=${encodeURIComponent(email)}`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const resendFrom =
      process.env.RESEND_FROM_EMAIL ?? "OpenDayCare <onboarding@resend.dev>";

    const { error: emailError } = await resend.emails.send({
      from: resendFrom,
      to: [email],
      subject: `Te invitaron a seguir el día de ${child.full_name} · Sala ${roomName}`,
      html: buildInvitationEmailHtml({
        kidName: child.full_name,
        roomName,
        code,
        activationUrl,
      }),
      text: buildInvitationEmailText({
        kidName: child.full_name,
        roomName,
        code,
        activationUrl,
      }),
    });

    if (emailError) {
      return { ok: false, error: "No se pudo enviar la invitación" };
    }
  } catch {
    return { ok: false, error: "No se pudo enviar la invitación" };
  }

  return { ok: true, code, expiresAt };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function resolveBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function buildInvitationEmailHtml({
  kidName,
  roomName,
  code,
  activationUrl,
}: {
  kidName: string;
  roomName: string;
  code: string;
  activationUrl: string;
}): string {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#FBF4EC;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:20px;font-weight:800;color:#6E6359;">OpenDayCare</span>
          </div>
          <div style="background:#FFFFFF;border-radius:16px;padding:32px;border:1px solid #ECE0D0;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#3F3430;">Te invitaron a seguir el día de ${kidName} · Sala ${roomName}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6E6359;">Usá este código para activar tu cuenta:</p>
            <div style="background:#FBF1D6;border:1.5px dashed #E6D08A;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <div style="font-size:28px;font-weight:800;letter-spacing:8px;color:#8A7234;">${code}</div>
              <div style="font-size:12px;color:#A88526;margin-top:8px;">El código vence en 7 días</div>
            </div>
            <a href="${activationUrl}" style="display:inline-block;background:#EE8164;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;">Activar mi cuenta</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildInvitationEmailText({
  kidName,
  roomName,
  code,
  activationUrl,
}: {
  kidName: string;
  roomName: string;
  code: string;
  activationUrl: string;
}): string {
  return `Te invitaron a seguir el día de ${kidName} · Sala ${roomName}

Tu código de invitación es: ${code}

Activá tu cuenta en: ${activationUrl}

El código vence en 7 días.
Equipo OpenDayCare`;
}