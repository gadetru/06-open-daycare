import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { childRowToKid } from "../lib/kids-utils";
import KidsClient, { type RoomGroup } from "./KidsClient";

type RoomRow = {
  id: string;
  name: string;
};

type ChildRowQuery = {
  id: string;
  room_id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
};

export default async function KidsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let notice: string | null = null;
  let groups: RoomGroup[] = [];

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (typeof userId !== "string" || userId.length === 0) {
      notice = "Iniciá sesión para ver los niños de tu sala.";
    } else {
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("daycare_id")
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      const daycareId = (userRow as { daycare_id: string } | null)?.daycare_id;

      if (!daycareId) {
        notice = "Tu usuario no tiene guardería asignada.";
      } else {
        const { data: roomRows, error: roomsError } = await supabase
          .from("rooms")
          .select("id, name")
          .eq("daycare_id", daycareId)
          .order("created_at");

        if (roomsError) {
          throw roomsError;
        }

        const typedRooms = (roomRows ?? []) as RoomRow[];
        const roomIds = typedRooms.map((room) => room.id);
        const roomNames = new Map(typedRooms.map((room) => [room.id, room.name]));

        let childRows: ChildRowQuery[] = [];
        if (roomIds.length > 0) {
          const { data: childrenData, error: childrenError } = await supabase
            .from("children")
            .select(
              "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent",
            )
            .eq("status", "active")
            .in("room_id", roomIds)
            .order("full_name");

          if (childrenError) {
            throw childrenError;
          }
          childRows = (childrenData ?? []) as ChildRowQuery[];
        }

        let cardIndex = 0;
        groups = typedRooms.map((room) => ({
          id: room.id,
          name: room.name,
          kids: childRows
            .filter((child) => child.room_id === room.id)
            .map((child) =>
              childRowToKid(
                { ...child, room_name: roomNames.get(child.room_id) ?? room.name },
                cardIndex++,
              ),
            ),
        }));
      }
    }
  } catch {
    notice = "No se pudieron cargar los niños. Reintentá más tarde.";
    groups = [];
  }

  return <KidsClient rooms={groups} notice={notice} />;
}
