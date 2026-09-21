export function buildRecipient(firstNames: string[]): string {
  if (firstNames.length === 0) {
    return "toda la sala";
  }

  if (firstNames.length === 1) {
    return `familia de ${firstNames[0]}`;
  }

  const allButLast = firstNames.slice(0, -1).join(", ");
  return `familias de ${allButLast} y ${firstNames[firstNames.length - 1]}`;
}