/** Splits "Bringing little *joys* to your everyday." into plain and accent pieces. Unbalanced stars stay as plain text. */
export function splitAccent(text) {
  const str = String(text || "");
  const parts = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push({ text: str.slice(last, m.index), accent: false });
    parts.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push({ text: str.slice(last), accent: false });
  return parts.length ? parts : [{ text: str, accent: false }];
}

/** The headline without star marks, for page titles and screen readers. */
export function plainHeadline(text) {
  return splitAccent(text).map((p) => p.text).join("");
}
