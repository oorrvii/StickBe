import { useCallback, useState } from "react";
import { Alert, Button, Card, Input, Skeleton, Textarea } from "../ui/index.js";
import { mergeSettings } from "../site/siteSettings.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { settingsToForm, validateSettings } from "./settingsForm.js";

function SettingsForm({ service, initial }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const set = (k) => (e) => { setNotice(""); setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value })); };
  const setTrust = (i, k) => (e) => setF((x) => ({ ...x, trustItems: x.trustItems.map((t, n) => (n === i ? { ...t, [k]: e.target.value } : t)) }));

  const save = async () => {
    const res = validateSettings(f);
    setNotice("");
    if (res.errors) { setErrors(res.errors); setProblem("Please fix the highlighted fields."); return; }
    setErrors({});
    setProblem("");
    setBusy(true);
    try {
      await service.saveSettings(res.data);
      setNotice("Saved. The shop shows the changes now.");
    } catch (e) {
      console.error(e);
      setProblem("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const E = (k) => errors[k];

  return (
    <>
      {notice && <Alert tone="success">{notice}</Alert>}
      {problem && <Alert tone="error">{problem}</Alert>}
      <div className="sb-admin__stack">
        <Card padded className="sb-adminsec">
          <h2>Sale</h2>
          <label className="sb-check"><input type="checkbox" checked={f.saleOn} onChange={set("saleOn")} /><span>Run a sale<small className="sb-check__sub">Takes the percent off every product, in the shop and at checkout.</small></span></label>
          <div className="sb-formgrid sb-formgrid--2">
            <Input label="Discount percent" inputMode="numeric" value={f.salePercent} onChange={set("salePercent")} error={E("salePercent")} />
            <Input label="Sale title" value={f.saleLabel} onChange={set("saleLabel")} error={E("saleLabel")} maxLength={60} />
            <Input label="First day (optional)" type="date" value={f.saleFrom} onChange={set("saleFrom")} hint="Starts at midnight India time." />
            <Input label="Last day (optional)" type="date" value={f.saleTo} onChange={set("saleTo")} error={E("saleTo")} hint="Runs until the end of this day." />
          </div>
        </Card>

        <Card padded className="sb-adminsec">
          <h2>Announcement bar</h2>
          <label className="sb-check"><input type="checkbox" checked={f.announcementOn} onChange={set("announcementOn")} /><span>Show the announcement bar</span></label>
          <Input label="Announcement" value={f.announcement} onChange={set("announcement")} error={E("announcement")} maxLength={160} />
        </Card>

        <Card padded className="sb-adminsec">
          <h2>Home page</h2>
          <Input label="Small heading above the headline" value={f.heroEyebrow} onChange={set("heroEyebrow")} error={E("heroEyebrow")} />
          <Input label="Headline" value={f.heroTitle} onChange={set("heroTitle")} error={E("heroTitle")} hint="Put stars around a word, like *joys*, to show it in the serif accent style." />
          <Textarea label="Sub-heading" rows={3} value={f.heroSubtitle} onChange={set("heroSubtitle")} error={E("heroSubtitle")} />
          <h3>Highlights under the headline</h3>
          {f.trustItems.map((t, i) => (
            <div key={i} className="sb-adminsec__row sb-adminsec__row--top">
              <div className="sb-adminsec__grow"><Input label={`Title ${i + 1}`} value={t.title} onChange={setTrust(i, "title")} /></div>
              <div className="sb-adminsec__grow"><Input label="Text" value={t.text} onChange={setTrust(i, "text")} /></div>
              <Button variant="ghost" size="sm" onClick={() => setF((x) => ({ ...x, trustItems: x.trustItems.filter((_, n) => n !== i) }))}>Remove</Button>
            </div>
          ))}
          {E("trustItems") && <p className="sb-field__error">{E("trustItems")}</p>}
          {f.trustItems.length < 4 && <div><Button variant="secondary" size="sm" onClick={() => setF((x) => ({ ...x, trustItems: [...x.trustItems, { title: "", text: "" }] }))}>Add a highlight</Button></div>}
          <Input label="Story small heading" value={f.storyEyebrow} onChange={set("storyEyebrow")} error={E("storyEyebrow")} />
          <Input label="Story title" value={f.storyTitle} onChange={set("storyTitle")} error={E("storyTitle")} />
          <Textarea label="Story text" rows={4} value={f.storyText} onChange={set("storyText")} error={E("storyText")} hint="Write only what is true about how you work." />
        </Card>

        <Card padded className="sb-adminsec">
          <h2>Contact and social</h2>
          <div className="sb-formgrid sb-formgrid--2">
            <Input label="Contact email" type="email" value={f.contactEmail} onChange={set("contactEmail")} error={E("contactEmail")} />
            <Input label="Instagram username" value={f.instagramHandle} onChange={set("instagramHandle")} error={E("instagramHandle")} />
            <Input label="Phone (optional)" inputMode="tel" value={f.phone} onChange={set("phone")} error={E("phone")} hint="10-digit mobile number." />
            <Input label="WhatsApp (optional)" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} error={E("whatsapp")} hint="10-digit mobile number." />
          </div>
        </Card>

        <Card padded className="sb-adminsec">
          <h2>Footer and shipping</h2>
          <Input label="Footer line" value={f.footerTagline} onChange={set("footerTagline")} error={E("footerTagline")} />
          <Textarea label="Shipping note (optional)" rows={2} value={f.shippingNote} onChange={set("shippingNote")} error={E("shippingNote")} hint="Shown at checkout and on product pages, for example delivery time." />
        </Card>

        <div className="sb-adminsec__row"><Button loading={busy} onClick={save}>Save settings</Button></div>
      </div>
    </>
  );
}

export default function AdminSettings() {
  const service = useCatalogService();
  const load = useCallback(async () => settingsToForm(mergeSettings(await service.getSettings())), [service]);
  const { data, loading, error, retry } = useAsync(load);
  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Settings</p>
          <h1>Settings</h1>
          <p className="sb-account__lead">Sale, announcement, home page text and contact details.</p>
        </div>
      </header>
      {error ? <Alert tone="error">We couldn't load settings. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
        : loading ? <Skeleton height={300} style={{ display: "block" }} />
        : <SettingsForm service={service} initial={data} />}
    </>
  );
}
