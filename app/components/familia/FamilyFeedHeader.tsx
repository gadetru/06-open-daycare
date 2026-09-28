type FamilyFeedHeaderProps = {
  parentName: string | null;
  childNames: string[];
  daycareName: string | null;
  todayLabel: string;
};

export default function FamilyFeedHeader({
  parentName,
  childNames,
  daycareName,
  todayLabel,
}: FamilyFeedHeaderProps) {
  const parentFirstName = parentName ? parentName.split(" ")[0] : null;
  const childLabel = formatChildLabel(childNames);

  return (
    <header className="mb-6">
      {daycareName && (
        <p className="mb-1 text-[12.5px] font-extrabold uppercase tracking-[.8px] text-primary">
          {daycareName}
        </p>
      )}

      <h1 className="font-heading text-[30px] font-semibold leading-tight text-ink">
        {parentFirstName ? `Buenas, ${parentFirstName}` : "Buenas"}
      </h1>

      <p className="mt-1 text-[14.5px] text-ink-muted">
        {childLabel ? `${childLabel} · ${todayLabel}` : todayLabel}
      </p>
    </header>
  );
}

// Solo primeros nombres, sin datos sensibles (sin sala, alergias ni fechas).
function formatChildLabel(childNames: string[]): string | null {
  if (childNames.length === 0) {
    return null;
  }
  const firstNames = childNames.map((fullName) => fullName.split(" ")[0]);
  if (firstNames.length === 1) {
    return firstNames[0];
  }
  const allButLast = firstNames.slice(0, -1).join(", ");
  return `${allButLast} y ${firstNames[firstNames.length - 1]}`;
}
