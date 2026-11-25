// Page text is plain text: blank line between paragraphs, "## " for a heading,
// "- " for a bullet. Nothing is treated as HTML.
export const PAGE_SLOTS = [
  { slug: "about", title: "About us" },
  { slug: "contact", title: "Contact" },
  { slug: "faq", title: "FAQ" },
  { slug: "shipping", title: "Shipping" },
  { slug: "returns", title: "Returns and refunds" },
  { slug: "privacy", title: "Privacy policy" },
  { slug: "terms", title: "Terms" },
];

export function parsePageText(text) {
  const blocks = [];
  for (const raw of String(text || "").replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^- /.test(l))) blocks.push({ type: "list", items: lines.map((l) => l.slice(2).trim()) });
    else if (lines.length === 1 && /^## /.test(lines[0])) blocks.push({ type: "heading", text: lines[0].slice(3).trim() });
    else {
      // A heading line directly followed by text stays a heading plus a paragraph.
      let rest = lines;
      if (/^## /.test(lines[0])) {
        blocks.push({ type: "heading", text: lines[0].slice(3).trim() });
        rest = lines.slice(1);
      }
      if (rest.length) blocks.push({ type: "para", text: rest.join("\n") });
    }
  }
  return blocks;
}

export function validatePage(f) {
  const errors = {};
  if (!f.title.trim()) errors.title = "Enter a title.";
  else if (f.title.length > 100) errors.title = "Keep the title under 100 characters.";
  if (f.published && !f.body.trim()) errors.body = "Add some text before publishing.";
  if (f.body.length > 20000) errors.body = "That's very long. Keep it under 20,000 characters.";
  return Object.keys(errors).length ? { errors } : { data: { title: f.title.trim(), body: f.body.trim(), published: !!f.published } };
}
