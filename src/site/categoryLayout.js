/** Column spans (out of 12) for the category mosaic, so every row fills completely whatever the number of categories. */
const ROWS = [[7, 5], [4, 4, 4], [5, 7], [6, 6], [4, 4, 4], [8, 4]];

export function mosaicSpans(count) {
  const spans = [];
  let remaining = count;
  let r = 0;
  while (remaining > 0) {
    if (remaining <= 4) {
      const each = 12 / remaining;
      for (let i = 0; i < remaining; i += 1) spans.push(each);
      break;
    }
    let row = ROWS[r % ROWS.length];
    r += 1;
    if (remaining - row.length === 1) row = row.length === 3 ? [6, 6] : row; // never strand a single small tile
    for (const s of row) spans.push(s);
    remaining -= row.length;
  }
  return spans.slice(0, count);
}
