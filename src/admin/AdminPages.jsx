import { useCallback, useState } from "react";
import { Alert, Badge, Button, Card, Input, Skeleton, Textarea } from "../ui/index.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { PAGE_SLOTS, validatePage } from "./pageText.js";

const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

function PageEditor({ slot, page, service, onDone }) {
  const [f, setF] = useState({ title: page?.title || slot.title, body: page?.body || "", published: page?.published === true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const save = async (publish) => {
    const next = publish === undefined ? f : { ...f, published: publish };
    const res = validatePage(next);
    if (res.errors) return setErrors(res.errors);
    setErrors({});
    setBusy(true);
    setProblem("");
    try {
      await service.savePage(slot.slug, res.data);
      onDone(res.data.published ? `${res.data.title} is published.` : `${res.data.title} saved as a draft.`);
    } catch (e) {
      console.error(e);
      setProblem("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card padded className="sb-adminsec">
      <h2>{slot.title}</h2>
      {problem && <Alert tone="error">{problem}</Alert>}
      <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={errors.title} maxLength={100} />
      <Textarea label="Text" rows={14} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} error={errors.body}
        hint="Leave a blank line between paragraphs. Start a line with ## for a heading, or with - for a bullet list." />
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={() => save(true)}>Save and publish</Button>
        <Button variant="secondary" loading={busy} onClick={() => save(false)}>Save as draft</Button>
        {page?.published && <Button variant="ghost" onClick={() => save(false)}>Unpublish</Button>}
        <Button variant="ghost" onClick={() => onDone("")}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function AdminPages() {
  const service = useCatalogService();
  const load = useCallback(() => service.listPages(), [service]);
  const { data, loading, error, retry, setData } = useAsync(load);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const done = async (msg) => {
    setEditing(null);
    setNotice(msg);
    if (msg) setData(await service.listPages());
  };
  const get = (slug) => (data || []).find((p) => p.slug === slug);
  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Pages</p>
          <h1>Pages</h1>
          <p className="sb-account__lead">Write the pages linked from the footer. A page appears on the shop only once it is published.</p>
        </div>
      </header>
      <Alert tone="info">Policy pages (privacy, terms, returns) should say what you really do. Write them yourself, or have them checked by someone who can advise you, before publishing.</Alert>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error ? <Alert tone="error">We couldn't load pages. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
        : loading ? <Skeleton height={200} style={{ display: "block" }} />
        : editing ? <PageEditor key={editing.slug} slot={editing} page={get(editing.slug)} service={service} onDone={done} />
        : (
          <div className="sb-orders">
            {PAGE_SLOTS.map((s) => {
              const p = get(s.slug);
              const state = !p ? ["Not written", "ink"] : p.published ? ["Published", "success"] : ["Draft", "lavender"];
              return (
                <div key={s.slug} className="sb-prodrow">
                  <div className="sb-prodrow__main">
                    <p className="sb-order__num">{s.title} <Badge tone={state[1]}>{state[0]}</Badge></p>
                    <p className="sb-order__date">/{s.slug}{p?.updatedAt ? ` · edited ${fmt(p.updatedAt)}` : ""}</p>
                  </div>
                  <div className="sb-prodrow__actions"><Button size="sm" variant="secondary" onClick={() => { setNotice(""); setEditing(s); }}>{p ? "Edit" : "Write"}</Button></div>
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}
