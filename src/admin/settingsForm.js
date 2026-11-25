// The Settings page: form values <-> the `settings/site` document.
import { DEFAULT_SETTINGS } from "../site/siteDefaults.js";
import { MAX_SALE_PERCENT } from "../site/saleLogic.js";

export const IST = "+05:30";
const dayStart = (d) => `${d}T00:00:00${IST}`;
const nextDay = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

/** A date the sale form can show again: first/last day in India. */
function toDay(v, lastDay) {
  if (!v) return "";
  const ms = typeof v === "number" ? v : typeof v?.toMillis === "function" ? v.toMillis() : Date.parse(v);
  if (!Number.isFinite(ms)) return "";
  const shifted = new Date(ms + 5.5 * 3600e3 - (lastDay ? 1 : 0));
  return shifted.toISOString().slice(0, 10);
}

export function settingsToForm(s) {
  const sale = s.sale || {};
  return {
    announcementOn: s.announcementOn !== false && !!s.announcement,
    announcement: s.announcement || "",
    heroEyebrow: s.heroEyebrow, heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle,
    trustItems: (s.trustItems || []).map((t) => ({ title: t.title, text: t.text || "" })),
    storyEyebrow: s.storyEyebrow, storyTitle: s.storyTitle, storyText: s.storyText,
    contactEmail: s.contactEmail || "", phone: s.phone || "", whatsapp: s.whatsapp || "", instagramHandle: s.instagramHandle || "",
    footerTagline: s.footerTagline, shippingNote: s.shippingNote || "",
    saleOn: sale.active === true, salePercent: sale.percent ? String(sale.percent) : "", saleLabel: sale.label || "",
    saleFrom: toDay(sale.startsAt, false), saleTo: toDay(sale.endsAt, true),
  };
}

const digits10 = (v) => String(v).replace(/\D/g, "").slice(-10);

export function validateSettings(f) {
  const errors = {};
  const need = (k, label, max) => {
    if (!String(f[k]).trim()) errors[k] = `Enter ${label}.`;
    else if (String(f[k]).length > max) errors[k] = `Keep this under ${max} characters.`;
  };
  need("heroTitle", "the home page headline", 120);
  need("storyTitle", "the story title", 100);
  need("footerTagline", "the footer line", 100);
  for (const [k, max] of [["heroEyebrow", 60], ["heroSubtitle", 300], ["storyEyebrow", 60], ["storyText", 1200], ["announcement", 160], ["shippingNote", 200]]) {
    if (String(f[k]).length > max) errors[k] = `Keep this under ${max} characters.`;
  }
  if (f.announcementOn && !f.announcement.trim()) errors.announcement = "Enter the announcement, or switch it off.";
  if (f.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim())) errors.contactEmail = "Enter a valid email address.";
  if (f.phone.trim() && digits10(f.phone).length !== 10) errors.phone = "Enter a 10-digit mobile number.";
  if (f.whatsapp.trim() && digits10(f.whatsapp).length !== 10) errors.whatsapp = "Enter a 10-digit mobile number.";
  const ig = f.instagramHandle.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,40}$/.test(ig)) errors.instagramHandle = "Enter the username only, for example stickbe.co";
  const trust = f.trustItems.filter((t) => t.title.trim());
  if (trust.length === 0) errors.trustItems = "Keep at least one line.";
  else if (trust.some((t) => t.title.length > 60 || t.text.length > 140)) errors.trustItems = "Titles up to 60 and text up to 140 characters.";

  let sale = { active: false, percent: 0, label: "", startsAt: "", endsAt: "" };
  const pct = /^\d{1,2}$/.test(f.salePercent.trim()) ? Number(f.salePercent) : null;
  if (f.saleOn) {
    if (pct === null || pct < 1 || pct > MAX_SALE_PERCENT) errors.salePercent = `Enter a percent from 1 to ${MAX_SALE_PERCENT}.`;
    if (f.saleLabel.length > 60) errors.saleLabel = "Keep the title under 60 characters.";
  }
  if (f.saleFrom && f.saleTo && f.saleTo < f.saleFrom) errors.saleTo = "The last day can't be before the first day.";
  if (!Object.keys(errors).length) {
    sale = {
      active: f.saleOn, percent: pct || 0, label: f.saleLabel.trim(),
      startsAt: f.saleFrom ? dayStart(f.saleFrom) : "", endsAt: f.saleTo ? dayStart(nextDay(f.saleTo)) : "",
    };
  }
  if (Object.keys(errors).length) return { errors };
  return {
    data: {
      announcementOn: f.announcementOn, announcement: f.announcement.trim(),
      heroEyebrow: f.heroEyebrow.trim() || DEFAULT_SETTINGS.heroEyebrow, heroTitle: f.heroTitle.trim(), heroSubtitle: f.heroSubtitle.trim() || DEFAULT_SETTINGS.heroSubtitle,
      trustItems: trust.map((t) => ({ title: t.title.trim(), text: t.text.trim() })),
      storyEyebrow: f.storyEyebrow.trim() || DEFAULT_SETTINGS.storyEyebrow, storyTitle: f.storyTitle.trim(), storyText: f.storyText.trim() || DEFAULT_SETTINGS.storyText,
      contactEmail: f.contactEmail.trim(), phone: f.phone.trim() ? digits10(f.phone) : "", whatsapp: f.whatsapp.trim() ? digits10(f.whatsapp) : "",
      instagramHandle: ig, instagramUrl: `https://instagram.com/${ig}`,
      footerTagline: f.footerTagline.trim(), shippingNote: f.shippingNote.trim(), sale,
    },
  };
}
