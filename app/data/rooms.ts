export const rooms = ["Soles", "Estrellas", "Arcoíris"] as const;

export type RoomName = (typeof rooms)[number];