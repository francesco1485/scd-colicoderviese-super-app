const NOISE =
  /^(a\.?s\.?d\.?|s\.?s\.?d\.?|u\.?s\.?d?\.?|g\.?s\.?d?\.?|a\.?c\.?d?\.?|f\.?c\.?d?\.?|pol\.?|polisportiva|asd|ssd|sq\.?[a-z]?|\d{4}|calcio|sport|club)$/i;

/** Up to two initials from the meaningful words of a club name ("ARS ROVAGNATE" → "AR", "ROVINATA" → "RO"). */
export function opponentInitials(name: string): string {
  const words = name
    .split(/[\s/-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}.]/gu, ""))
    .filter((w) => w && !NOISE.test(w));
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  const w = words[0] ?? name.trim();
  return w.slice(0, 2).toUpperCase() || "?";
}
