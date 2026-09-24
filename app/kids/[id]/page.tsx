import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type {
  AcceptedParentRow,
  ChildRow,
  ParentRelationshipValue,
  PendingInvitationRow,
} from "../../lib/kids-utils";
import KidProfileClient from "./KidProfileClient";

type RoomRow = {
  id: string;
  name: string;
};

type LinkRowData = {
  relationship: string;
  users:
    | { full_name: string; status: string }
    | { full_name: string; status: string }[]
    | null;
};

type KidProfilePageProps = {
  params: Promise<{ id: string }>;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function KidProfilePage({ params }: KidProfilePageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let notice: string | null = null;
  let rooms: RoomRow[] = [];
  let child: ChildRow | null = null;
  let pendingInvitations: PendingInvitationRow[] = [];
  let acceptedParents: AcceptedParentRow[] = [];

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string" || userId.length === 0) {
    notice = "Iniciá sesión para ver el perfil del niño.";
  } else {
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("daycare_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      notice = "No se pudo cargar el niño. Reintentá más tarde.";
    } else {
      const daycareId = (userRow as { daycare_id: string | null })?.daycare_id;

      if (!daycareId) {
        notice = "Tu usuario no tiene guardería asignada.";
      } else {
        const { data: roomRows, error: roomsError } = await supabase
          .from("rooms")
          .select("id, name")
          .eq("daycare_id", daycareId);

        if (roomsError) {
          notice = "No se pudo cargar el niño. Reintentá más tarde.";
        } else {
          rooms = ((roomRows ?? []) as RoomRow[]).map((room) => ({
            id: room.id,
            name: room.name,
          }));
        }
      }
    }
  }

  if (notice === null && isValidUuid(id)) {
    const { data: childData, error: childError } = await supabase
      .from("children")
      .select(
        "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent",
      )
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (childError) {
      notice = "No se pudo cargar el niño. Reintentá más tarde.";
    } else if (childData) {
      const typedChild = childData as ChildRow;
      const roomName =
        rooms.find((room) => room.id === typedChild.room_id)?.name ?? "";
      child = { ...typedChild, room_name: roomName };

      const { data: invitationData } = await supabase
        .from("invitations")
        .select("full_name, email, relationship")
        .eq("child_id", id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      pendingInvitations = (invitationData ?? []) as PendingInvitationRow[];

      const { data: linkData } = await supabase
        .from("parent_children")
        .select("relationship, users(full_name, status)")
        .eq("child_id", id);

      const linkedRows = (linkData ?? []) as unknown as LinkRowData[];
      acceptedParents = linkedRows
        .map((row) => ({
          user: normalizeLinkedUser(row.users),
          relationship: row.relationship,
        }))
        .filter((entry) => entry.user?.status === "active")
        .map((entry) => ({
          full_name: (entry.user as { full_name: string }).full_name,
          relationship: entry.relationship as ParentRelationshipValue,
        }));
    }
  }

  return (
    <KidProfileClient
      child={child}
      rooms={rooms}
      notice={notice}
      pendingInvitations={pendingInvitations}
      acceptedParents={acceptedParents}
    />
  );
}

function normalizeLinkedUser(
  user: LinkRowData["users"],
): { full_name: string; status: string } | null {
  if (Array.isArray(user)) {
    return user[0] ?? null;
  }
  return user ?? null;
}