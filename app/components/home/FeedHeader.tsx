type FeedHeaderProps = {
  daycareName: string | null;
  staffName: string | null;
  roomName: string | null;
  kidsCount: number;
  todayLabel: string;
};

export default function FeedHeader({
  daycareName,
  staffName,
  roomName,
  kidsCount,
  todayLabel,
}: FeedHeaderProps) {
  // En el seed la guardería se llama "Guardería Sala Soles": cuando el nombre de
  // la guardería ya dice la sala, no la repetimos en la línea de ubicación.
  const roomIsAlreadyInDaycareName =
    roomName !== null && daycareName !== null && daycareName.includes(roomName);

  const locationParts = [
    daycareName,
    roomName !== null && !roomIsAlreadyInDaycareName ? `Sala ${roomName}` : null,
  ].filter((part): part is string => part !== null);
  const staffFirstName = staffName ? staffName.split(" ")[0] : null;
  const kidsLabel = kidsCount === 1 ? "niño" : "niños";

  return (
    <header className="mb-6">
      {locationParts.length > 0 && (
        <p className="mb-1 text-[12.5px] font-extrabold uppercase tracking-[.8px] text-primary">
          {locationParts.join(" · ")}
        </p>
      )}

      <h1 className="font-heading text-[30px] font-semibold leading-tight text-ink">
        {staffFirstName ? `Buenas, ${staffFirstName}` : "Buenas"}
      </h1>

      <p className="mt-1 text-[14.5px] text-ink-muted">
        {kidsCount} {kidsLabel} · {todayLabel}
      </p>
    </header>
  );
}
